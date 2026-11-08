import { DomainError } from '#/shared/errors/domain.error.ts';

// A skipped occurrence takes no payment and no manual mark.
export class OccurrenceSkippedError extends DomainError {
  readonly code = 'OCCURRENCE_SKIPPED';

  constructor() {
    super('A ocorrência está dispensada.');
  }
}
