import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The occurrence does not exist.
export class OccurrenceNotFoundError extends NotFoundError {
  readonly code = 'OCCURRENCE_NOT_FOUND';

  constructor() {
    super('A ocorrência não existe.');
  }
}
