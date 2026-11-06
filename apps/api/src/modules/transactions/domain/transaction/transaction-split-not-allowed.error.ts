import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionSplitNotAllowedError extends DomainError {
  readonly code = 'TRANSACTION_SPLIT_NOT_ALLOWED';

  constructor() {
    super('Só despesa e receita se dividem.');
  }
}
