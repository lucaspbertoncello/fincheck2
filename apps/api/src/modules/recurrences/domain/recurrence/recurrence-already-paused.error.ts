import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Pausing a recurrence that is already paused.
export class RecurrenceAlreadyPausedError extends ConflictError {
  readonly code = 'RECURRENCE_ALREADY_PAUSED';

  constructor() {
    super('A recorrência já está pausada.');
  }
}
