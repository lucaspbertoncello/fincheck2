import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionAccountArchivedError extends DomainError {
  readonly code = 'TRANSACTION_ACCOUNT_ARCHIVED';

  constructor() {
    super('A conta está arquivada.');
  }
}
