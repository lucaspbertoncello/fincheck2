import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The id matches no category.
export class CategoryNotFoundError extends NotFoundError {
  readonly code = 'CATEGORY_NOT_FOUND';

  constructor() {
    super('A categoria não existe.');
  }
}
