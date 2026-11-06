import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionNatureLockedError extends DomainError {
  readonly code = 'TRANSACTION_NATURE_LOCKED';

  constructor() {
    super('A natureza só muda pelo fluxo que a criou.');
  }
}
