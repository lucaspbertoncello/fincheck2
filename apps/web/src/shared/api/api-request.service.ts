import type { z } from 'zod';

import { ApiError, CLIENT_ERROR_CODES } from '#/shared/api/api.error.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';
import { serializeQuery } from '#/shared/api/serialize-query.util.ts';

type Schema = z.ZodType | undefined;

interface ApiRequestSpec<Q extends Schema, B extends Schema, R extends Schema> {
  method: ApiRequest.Method;
  // Path without `/api`, with the params already in it (use `apiPath`).
  path: string;
  // Each schema checks what goes out (query, body) or what comes back (response).
  querySchema?: Q;
  query?: ApiRequest.QueryInput<Q>;
  bodySchema?: B;
  body?: ApiRequest.BodyInput<B>;
  responseSchema?: R;
  signal?: AbortSignal;
}

function invalid(what: string, error: z.ZodError, code: string, status: number): ApiError {
  return new ApiError(status, code, `${what} fora do contrato`, {
    issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * The thin typed client: every call to `/api` goes through here. It validates the query and the body
 * before sending, validates the answer and turns any failure into an `ApiError` with the contract
 * `code`. The local token is not here: the Vite proxy adds it (`scripts/dev-server/`).
 */
export async function apiRequest<
  Q extends Schema = undefined,
  B extends Schema = undefined,
  R extends Schema = undefined,
>(spec: ApiRequestSpec<Q, B, R>): Promise<ApiRequest.Output<R>> {
  const url = new URL(`/api${spec.path}`, globalThis.location.origin);

  if (spec.querySchema) {
    const query = serializeQuery(spec.query ?? {});
    const checked = spec.querySchema.safeParse(query);
    if (!checked.success) {
      throw invalid('Consulta', checked.error, CLIENT_ERROR_CODES.requestInvalid, 0);
    }
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: string | undefined;
  if (spec.bodySchema) {
    const checked = spec.bodySchema.safeParse(spec.body);
    if (!checked.success) {
      throw invalid('Corpo', checked.error, CLIENT_ERROR_CODES.requestInvalid, 0);
    }
    headers['Content-Type'] = 'application/json';
    // The parsed body, so schema defaults (a `null` for an unused rule field) reach the API.
    body = JSON.stringify(checked.data);
  }

  let response: Response;
  try {
    response = await fetch(url, { method: spec.method, headers, body, signal: spec.signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(
      0,
      CLIENT_ERROR_CODES.network,
      'Não foi possível falar com a API',
      undefined,
      { cause },
    );
  }

  const json = await readJson(response);
  if (!response.ok) throw ApiError.fromResponseBody(response.status, json);

  if (!spec.responseSchema) return undefined as ApiRequest.Output<R>;
  const checked = spec.responseSchema.safeParse(json);
  if (!checked.success) {
    throw invalid('Resposta', checked.error, CLIENT_ERROR_CODES.responseInvalid, response.status);
  }

  return checked.data as ApiRequest.Output<R>;
}
