import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

/**
 * The line under the invoice total: "Fecha 30/10, vence 06/11", "Fechou 18/10, vence 28/10",
 * "Venceu em 28/10" or "Paga em 21/10". A partial payment says what is still missing.
 */
export function buildInvoiceDueLine(invoice: Invoice.Dto): string {
  const closes = formatShortDate(invoice.closesOn);
  const due = formatShortDate(invoice.dueOn);

  switch (invoice.status) {
    case 'open':
    case 'projected':
      return `Fecha ${closes}, vence ${due}`;
    case 'paid': {
      const last = invoice.payments.at(-1);
      return last ? `Paga em ${formatShortDate(last.paidOn)}` : 'Nada a pagar';
    }
    case 'overdue':
      return `Venceu em ${due}, faltam ${formatMoney(invoice.remainingCents)}`;
    case 'partial':
      return `Fechou ${closes}, vence ${due}, faltam ${formatMoney(invoice.remainingCents)}`;
    case 'closed':
      return `Fechou ${closes}, vence ${due}`;
  }
}
