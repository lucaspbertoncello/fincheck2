import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Archiving an account that is already archived.
export class AccountAlreadyArchivedError extends ConflictError {
  readonly code = 'ACCOUNT_ALREADY_ARCHIVED';

  constructor() {
    super('A conta já está arquivada.');
  }
}
