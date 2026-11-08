import { DomainError } from '#/shared/errors/domain.error.ts';

// The employment regime is a label of an income source (BR-PRF-002).
export class RecurrenceRegimeOnlyForIncomeError extends DomainError {
  readonly code = 'RECURRENCE_REGIME_ONLY_FOR_INCOME';

  constructor() {
    super('O regime de trabalho só vale para receita.');
  }
}
