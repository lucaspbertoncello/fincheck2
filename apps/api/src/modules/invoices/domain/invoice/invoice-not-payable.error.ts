import { DomainError } from '#/shared/errors/domain.error.ts';

// The invoice is a projection (its month has not opened yet): it cannot receive a payment.
export class InvoiceNotPayableError extends DomainError {
  readonly code = 'INVOICE_NOT_PAYABLE';

  constructor() {
    super('A fatura ainda não abriu: não dá para registrar pagamento nela.');
  }
}
