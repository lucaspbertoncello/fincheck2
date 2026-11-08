import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Skipping an occurrence that is already skipped.
export class OccurrenceAlreadySkippedError extends ConflictError {
  readonly code = 'OCCURRENCE_ALREADY_SKIPPED';

  constructor() {
    super('A ocorrência já está dispensada.');
  }
}
