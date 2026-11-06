import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionNotManualError extends DomainError {
  readonly code = 'TRANSACTION_NOT_MANUAL';

  constructor() {
    super('Só a transação lançada à mão se exclui; a importada se ignora.');
  }
}
