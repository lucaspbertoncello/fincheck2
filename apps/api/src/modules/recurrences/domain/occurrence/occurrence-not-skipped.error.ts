import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Unskipping an occurrence that is not skipped.
export class OccurrenceNotSkippedError extends ConflictError {
  readonly code = 'OCCURRENCE_NOT_SKIPPED';

  constructor() {
    super('A ocorrência não está dispensada.');
  }
}
