import { DomainError } from '#/shared/errors/domain.error.ts';

// A tag belongs to a category: a transaction with no category takes no tag.
export class TransactionTagNeedsCategoryError extends DomainError {
  readonly code = 'TRANSACTION_TAG_NEEDS_CATEGORY';

  constructor() {
    super('Escolha a categoria da transação antes de usar tags.');
  }
}
