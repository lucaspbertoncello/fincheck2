import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionSplitSumMismatchError extends DomainError {
  readonly code = 'TRANSACTION_SPLIT_SUM_MISMATCH';

  constructor() {
    super('A soma das partes difere do valor da transação.');
  }
}
