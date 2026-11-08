import { DomainError } from '#/shared/errors/domain.error.ts';

// The category is an income one on an expense recurrence, or the other way round.
export class RecurrenceCategoryKindMismatchError extends DomainError {
  readonly code = 'RECURRENCE_CATEGORY_KIND_MISMATCH';

  constructor() {
    super('A categoria é de outro tipo que a recorrência.');
  }
}
