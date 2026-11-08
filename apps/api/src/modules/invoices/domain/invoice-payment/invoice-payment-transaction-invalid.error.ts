import { DomainError } from '#/shared/errors/domain.error.ts';

// The transaction cannot pay this invoice: it is not an outgoing of an own account (or a credit of
// this very card), it is ignored or has another role (transfer, debt, adjustment, a split), or the
// amount is more than the transaction.
export class InvoicePaymentTransactionInvalidError extends DomainError {
  readonly code = 'INVOICE_PAYMENT_TRANSACTION_INVALID';

  constructor(reason: string) {
    super(`Essa transação não pode pagar esta fatura: ${reason}`);
  }
}
