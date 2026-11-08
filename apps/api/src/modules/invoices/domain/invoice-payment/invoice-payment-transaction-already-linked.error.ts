import { ConflictError } from '#/shared/errors/conflict.error.ts';

// A transaction pays one invoice only.
export class InvoicePaymentTransactionAlreadyLinkedError extends ConflictError {
  readonly code = 'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED';

  constructor() {
    super('Essa transação já paga uma fatura.');
  }
}
