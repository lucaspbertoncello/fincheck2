import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { InvoicePaymentData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';
import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

/** The payments of the invoice, one line each ("Pago em 21/10"), with what "Desfazer" asks. */
export function buildInvoicePayments(payments: Invoice.Dto['payments']): InvoicePaymentData[] {
  return payments.map((payment) => {
    const date = formatShortDate(payment.paidOn);

    return {
      id: payment.id,
      label: `Pago em ${date}`,
      cents: payment.amountCents,
      undoContext: `pagamento de ${date}`,
      undoDescription: `O pagamento de ${formatMoney(payment.amountCents)} feito em ${date} sai da fatura, e esse valor volta a faltar pagar.`,
    };
  });
}
