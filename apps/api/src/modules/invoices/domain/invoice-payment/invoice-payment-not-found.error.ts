import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The payment does not exist, or it belongs to another invoice.
export class InvoicePaymentNotFoundError extends NotFoundError {
  readonly code = 'INVOICE_PAYMENT_NOT_FOUND';

  constructor() {
    super('O pagamento não existe nesta fatura.');
  }
}
