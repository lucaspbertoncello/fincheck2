import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The id matches no account.
export class AccountNotFoundError extends NotFoundError {
  readonly code = 'ACCOUNT_NOT_FOUND';

  constructor() {
    super('A conta não existe.');
  }
}
