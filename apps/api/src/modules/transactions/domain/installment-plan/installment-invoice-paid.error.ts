import { DomainError } from '#/shared/errors/domain.error.ts';

// The change would move money on an invoice that already has a payment registered: the paid
// amount would stop matching what the invoice holds. Undo the payment first.
export class InstallmentInvoicePaidError extends DomainError {
  readonly code = 'INSTALLMENT_INVOICE_PAID';

  constructor(invoiceMonth: string) {
    super(
      `A fatura de ${invoiceMonth} já tem pagamento registrado: desfaça o pagamento antes de mudar o valor, a quantidade ou o mês das parcelas.`,
      { invoiceMonth },
    );
  }
}
