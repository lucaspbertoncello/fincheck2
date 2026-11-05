import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { formatShortDate } from '#/features/invoices/invoice-summary/utils/format-short-date.util.ts';

/** The payments of the invoice, one line each ("Pago em 21/10"). */
export function buildInvoicePayments(
  payments: Invoice.Dto['payments'],
): { id: string; label: string; cents: number }[] {
  return payments.map((payment) => ({
    id: payment.id,
    label: `Pago em ${formatShortDate(payment.paidOn)}`,
    cents: payment.amountCents,
  }));
}
