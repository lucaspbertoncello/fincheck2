import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionMethodAccountMismatchError extends DomainError {
  readonly code = 'TRANSACTION_METHOD_ACCOUNT_MISMATCH';

  constructor() {
    super('O meio de pagamento e a conta não combinam.');
  }
}
