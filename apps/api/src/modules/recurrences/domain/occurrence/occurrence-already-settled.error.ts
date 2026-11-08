import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Settling or skipping an occurrence that is already confirmed.
export class OccurrenceAlreadySettledError extends ConflictError {
  readonly code = 'OCCURRENCE_ALREADY_SETTLED';

  constructor() {
    super('A ocorrência já está paga ou recebida.');
  }
}
