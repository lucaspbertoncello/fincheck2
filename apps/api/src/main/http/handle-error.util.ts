import type { ApiError } from '@fincheck/shared/common/api-error/api-error.type.ts';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { ApplicationError } from '#/shared/errors/application.error.ts';
import { ConflictError } from '#/shared/errors/conflict.error.ts';
import { DomainError } from '#/shared/errors/domain.error.ts';
import { NotFoundError } from '#/shared/errors/not-found.error.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { UnauthorizedError } from '#/shared/errors/unauthorized.error.ts';
import { ValidationError } from '#/shared/errors/validation.error.ts';

// The single translation from error to HTTP answer (`app.onError`). Known errors become their
// family status with `{ code, message, details? }`; anything else is a 500 with a generic message,
// and only its name and stack go to the log, never `details` (they may carry user data).
export function handleError(error: Error, c: Context) {
  // Hono's validator throws a bare 400 for a body that is not JSON; it takes the same path as any
  // other invalid input.
  if (error instanceof HTTPException && error.status === 400) {
    return handleError(new RequestValidationError([{ path: '', message: error.message }]), c);
  }

  if (error instanceof ApplicationError) {
    const status: ContentfulStatusCode =
      error instanceof ValidationError
        ? 400
        : error instanceof UnauthorizedError
          ? 401
          : error instanceof NotFoundError
            ? 404
            : error instanceof ConflictError
              ? 409
              : error instanceof DomainError
                ? 422
                : 500;
    const body: ApiError.Dto = { code: error.code, message: error.message };
    if (error.details) {
      body.details = error.details;
    }
    return c.json(body, status);
  }

  console.error(`${error.name}: ${error.stack ?? error.message}`);
  const body: ApiError.Dto = { code: 'INTERNAL_ERROR', message: 'Erro inesperado na API.' };
  return c.json(body, 500);
}
