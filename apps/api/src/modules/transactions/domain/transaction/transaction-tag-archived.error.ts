import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionTagArchivedError extends DomainError {
  readonly code = 'TRANSACTION_TAG_ARCHIVED';

  constructor() {
    super('Uma das tags está arquivada.');
  }
}
