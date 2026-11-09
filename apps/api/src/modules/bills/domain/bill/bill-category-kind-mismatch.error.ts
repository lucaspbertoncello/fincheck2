import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillCategoryKindMismatchError extends DomainError {
  readonly code = 'BILL_CATEGORY_KIND_MISMATCH';

  constructor() {
    super('A categoria não combina com o sentido da conta.');
  }
}
