import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionIsSplitError extends DomainError {
  readonly code = 'TRANSACTION_IS_SPLIT';

  constructor() {
    super('A transação está dividida: desfaça a divisão antes.');
  }
}
