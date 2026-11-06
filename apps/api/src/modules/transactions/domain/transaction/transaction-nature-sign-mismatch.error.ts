import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionNatureSignMismatchError extends DomainError {
  readonly code = 'TRANSACTION_NATURE_SIGN_MISMATCH';

  constructor() {
    super('A natureza não combina com o sinal do valor.');
  }
}
