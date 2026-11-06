import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionCategoryArchivedError extends DomainError {
  readonly code = 'TRANSACTION_CATEGORY_ARCHIVED';

  constructor() {
    super('A categoria está arquivada.');
  }
}
