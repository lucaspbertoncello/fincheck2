import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class TransactionNotSplitError extends ConflictError {
  readonly code = 'TRANSACTION_NOT_SPLIT';

  constructor() {
    super('A transação não está dividida.');
  }
}
