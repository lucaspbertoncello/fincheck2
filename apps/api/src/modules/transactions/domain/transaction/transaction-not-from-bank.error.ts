import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionNotFromBankError extends DomainError {
  readonly code = 'TRANSACTION_NOT_FROM_BANK';

  constructor() {
    super('A transação foi lançada à mão e não tem original do banco.');
  }
}
