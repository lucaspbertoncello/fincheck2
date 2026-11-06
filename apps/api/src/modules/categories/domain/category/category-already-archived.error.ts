import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class CategoryAlreadyArchivedError extends ConflictError {
  readonly code = 'CATEGORY_ALREADY_ARCHIVED';

  constructor() {
    super('A categoria já está arquivada.');
  }
}
