import { DomainError } from '#/shared/errors/domain.error.ts';

// A tag cannot be created in an archived category: it could not be used on any transaction.
export class TagCategoryArchivedError extends DomainError {
  readonly code = 'TAG_CATEGORY_ARCHIVED';

  constructor() {
    super('A categoria está arquivada: não dá para criar uma tag nela.');
  }
}
