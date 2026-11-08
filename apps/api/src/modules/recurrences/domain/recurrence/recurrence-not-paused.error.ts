import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Resuming a recurrence that is not paused.
export class RecurrenceNotPausedError extends ConflictError {
  readonly code = 'RECURRENCE_NOT_PAUSED';

  constructor() {
    super('A recorrência não está pausada.');
  }
}
