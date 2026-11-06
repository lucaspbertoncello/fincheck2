import { ValidationError } from '#/shared/errors/validation.error.ts';

// The request broke its schema. `details.issues` lists the path and the message of each field.
export class RequestValidationError extends ValidationError {
  readonly code = 'VALIDATION_FAILED';

  constructor(issues: RequestValidationError.Issue[]) {
    super('Os dados enviados são inválidos.', { issues });
  }
}

export namespace RequestValidationError {
  export type Issue = { path: string; message: string };
}
