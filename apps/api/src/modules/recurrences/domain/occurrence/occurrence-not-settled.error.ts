import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Unsettling an occurrence that has no manual mark.
export class OccurrenceNotSettledError extends ConflictError {
  readonly code = 'OCCURRENCE_NOT_SETTLED';

  constructor() {
    super('A ocorrência não foi marcada à mão.');
  }
}
