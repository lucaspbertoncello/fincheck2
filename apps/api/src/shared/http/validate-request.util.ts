import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';

import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

// Validates one part of the request (`json`, `query`, `param`...) with the schema of
// `@fincheck/shared`. When it fails it throws `RequestValidationError`, which `handleError` turns
// into the 400 `{ code: 'VALIDATION_FAILED', message, details }`, instead of the answer the
// `@hono/zod-validator` would build on its own.
export function validateRequest<Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new RequestValidationError(
        result.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }
  });
}
