import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Unarchiving an account that is not archived.
export class AccountNotArchivedError extends ConflictError {
  readonly code = 'ACCOUNT_NOT_ARCHIVED';

  constructor() {
    super('A conta não está arquivada.');
  }
}
