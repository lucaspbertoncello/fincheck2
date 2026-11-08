import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The recurrence does not exist.
export class RecurrenceNotFoundError extends NotFoundError {
  readonly code = 'RECURRENCE_NOT_FOUND';

  constructor() {
    super('A recorrência não existe.');
  }
}
