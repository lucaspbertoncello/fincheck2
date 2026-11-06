import { ConflictError } from '#/shared/errors/conflict.error.ts';

export class TagAlreadyArchivedError extends ConflictError {
  readonly code = 'TAG_ALREADY_ARCHIVED';

  constructor() {
    super('A tag já está arquivada.');
  }
}
