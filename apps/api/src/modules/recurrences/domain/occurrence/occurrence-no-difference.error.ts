import { DomainError } from '#/shared/errors/domain.error.ts';

// Answering a difference that the occurrence does not have.
export class OccurrenceNoDifferenceError extends DomainError {
  readonly code = 'OCCURRENCE_NO_DIFFERENCE';

  constructor() {
    super('A ocorrência não tem diferença de valor.');
  }
}
