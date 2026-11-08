import { DomainError } from '#/shared/errors/domain.error.ts';

// A recurrence cannot be created in, or moved to, an archived account. The code is the one the
// accounts context uses for the same refusal.
export class RecurrenceAccountArchivedError extends DomainError {
  readonly code = 'ACCOUNT_ARCHIVED';

  constructor() {
    super('A conta está arquivada.');
  }
}
