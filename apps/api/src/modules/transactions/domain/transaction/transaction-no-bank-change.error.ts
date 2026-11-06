import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionNoBankChangeError extends DomainError {
  readonly code = 'TRANSACTION_NO_BANK_CHANGE';

  constructor() {
    super('Não há mudança do banco para resolver.');
  }
}
