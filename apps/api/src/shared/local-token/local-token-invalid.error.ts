import { UnauthorizedError } from '#/shared/errors/unauthorized.error.ts';

export class LocalTokenInvalidError extends UnauthorizedError {
  readonly code = 'LOCAL_TOKEN_INVALID';

  constructor() {
    super('O token local está ausente ou é inválido.');
  }
}
