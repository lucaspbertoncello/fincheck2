import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillPaymentTransactionInvalidError extends DomainError {
  readonly code = 'BILL_PAYMENT_TRANSACTION_INVALID';

  constructor() {
    super('A transação não pode pagar esta conta.');
  }
}
