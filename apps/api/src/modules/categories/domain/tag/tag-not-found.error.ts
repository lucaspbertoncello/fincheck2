import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The id matches no tag.
export class TagNotFoundError extends NotFoundError {
  readonly code = 'TAG_NOT_FOUND';

  constructor() {
    super('A tag não existe.');
  }
}
