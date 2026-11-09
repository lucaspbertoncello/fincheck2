import { DomainError } from '#/shared/errors/domain.error.ts';

// A transaction only takes tags of its own category (PM, 09/11/2026).
export class TransactionTagCategoryMismatchError extends DomainError {
  readonly code = 'TRANSACTION_TAG_CATEGORY_MISMATCH';

  constructor() {
    super('Uma das tags não é da categoria da transação.');
  }
}
