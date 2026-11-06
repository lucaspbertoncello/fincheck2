import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class TransactionAlreadyIgnoredError extends ConflictError {
  readonly code = 'TRANSACTION_ALREADY_IGNORED';

  constructor() {
    super('A transação já está ignorada.');
  }
}
