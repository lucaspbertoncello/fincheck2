import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class CategoryNotArchivedError extends ConflictError {
  readonly code = 'CATEGORY_NOT_ARCHIVED';

  constructor() {
    super('A categoria não está arquivada.');
  }
}
