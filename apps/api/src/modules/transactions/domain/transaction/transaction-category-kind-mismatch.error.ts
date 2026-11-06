import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionCategoryKindMismatchError extends DomainError {
  readonly code = 'TRANSACTION_CATEGORY_KIND_MISMATCH';

  constructor() {
    super('O tipo da categoria é diferente do tipo da transação.');
  }
}
