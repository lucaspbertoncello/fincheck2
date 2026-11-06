import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class TransactionNotIgnoredError extends ConflictError {
  readonly code = 'TRANSACTION_NOT_IGNORED';

  constructor() {
    super('A transação não está ignorada.');
  }
}
