import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';
import { HttpResponse, type HttpResponseResolver } from 'msw';
import type { z } from 'zod';

import { MockApiError } from '#mocks/support/http/mock-api.error.ts';

type Output<S> = S extends z.ZodType ? z.output<S> : undefined;
type Result<R> = R extends z.ZodType ? z.input<R> : void;

interface RouteSpec<Q, B, R> {
  query?: Q;
  body?: B;
  // The answer is parsed by this schema: a mock that leaves the contract breaks right here.
  response?: R;
  status?: number;
}

interface RouteInput<Q, B> {
  params: Record<string, string>;
  query: Output<Q>;
  body: Output<B>;
}

function errorResponse(error: MockApiError) {
  const body = apiErrorSchema.parse({
    code: error.code,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
  });

  return HttpResponse.json(body, { status: error.status });
}

function validationError(error: z.ZodError) {
  return new MockApiError(400, 'VALIDATION_FAILED', 'Entrada fora do contrato', {
    issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

// The API reads every `:id` and `:<name>Id` of the path as a UUID: a malformed one is a 400, never a
// 404 (`mock vs api.md` 6, 26, 47, 58, 110).
function assertIdParams(params: Record<string, string>): void {
  const issues = Object.entries(params)
    .filter(
      ([key, value]) => (key === 'id' || key.endsWith('Id')) && !idSchema.safeParse(value).success,
    )
    .map(([key]) => ({ path: key, message: 'Invalid UUID' }));
  if (issues.length > 0) {
    throw new MockApiError(400, 'VALIDATION_FAILED', 'Entrada fora do contrato', { issues });
  }
}

// Wraps a route: validates query and body with the contract schemas, runs the handler against the
// in-memory state, validates the answer and turns thrown `MockApiError`s into the error body.
export function handleRoute<
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType | undefined = undefined,
>(
  spec: RouteSpec<Q, B, R>,
  run: (input: RouteInput<Q, B>) => Result<R> | Promise<Result<R>>,
): HttpResponseResolver {
  return async ({ request, params }) => {
    try {
      const pathParams = Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      );

      assertIdParams(pathParams);

      let query: unknown;
      if (spec.query) {
        const parsed = spec.query.safeParse(
          Object.fromEntries(new URL(request.url).searchParams.entries()),
        );
        if (!parsed.success) throw validationError(parsed.error);
        query = parsed.data;
      }

      let body: unknown;
      if (spec.body) {
        const json: unknown = await request.json().catch(() => undefined);
        const parsed = spec.body.safeParse(json);
        if (!parsed.success) throw validationError(parsed.error);
        body = parsed.data;
      }

      const result = await run({ params: pathParams, query, body } as RouteInput<Q, B>);

      if (!spec.response) return new HttpResponse(null, { status: spec.status ?? 204 });

      const answer = spec.response.parse(result) as Record<string, unknown>;

      return HttpResponse.json(answer, { status: spec.status ?? 200 });
    } catch (error) {
      if (error instanceof MockApiError) return errorResponse(error);
      throw error;
    }
  };
}
