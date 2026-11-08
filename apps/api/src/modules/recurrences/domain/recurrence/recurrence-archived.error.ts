import { DomainError } from '#/shared/errors/domain.error.ts';

// The recurrence was deleted (archived): it takes no change.
export class RecurrenceArchivedError extends DomainError {
  readonly code = 'RECURRENCE_ARCHIVED';

  constructor() {
    super('A recorrência está arquivada.');
  }
}
