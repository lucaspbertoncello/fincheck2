import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class TagNotArchivedError extends ConflictError {
  readonly code = 'TAG_NOT_ARCHIVED';

  constructor() {
    super('A tag não está arquivada.');
  }
}
