import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionCategoryNotAllowedError extends DomainError {
  readonly code = 'TRANSACTION_CATEGORY_NOT_ALLOWED';

  constructor() {
    super('Transação fora da conta não tem categoria.');
  }
}
