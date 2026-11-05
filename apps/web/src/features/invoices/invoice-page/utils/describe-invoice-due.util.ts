import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';

const DAY_MS = 86_400_000;

function toTime(businessDate: string): number {
  const [year = 0, month = 1, day = 1] = businessDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function plural(count: number): string {
  return count === 1 ? 'dia' : 'dias';
}

/**
 * When the invoice is due, in words: "vence em 15 dias", "vence amanhã", "vence hoje", "venceu há
 * 3 dias", "paga em 21/10". A paid invoice says when it was paid; a projected one is not due yet
 * but still says how far it is.
 */
export function describeInvoiceDue(invoice: Invoice.Dto, today: string): string {
  if (invoice.status === 'paid') {
    const last = invoice.payments.at(-1);
    return last ? `paga em ${formatShortDate(last.paidOn)}` : 'nada a pagar';
  }

  const days = Math.round((toTime(invoice.dueOn) - toTime(today)) / DAY_MS);
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  if (days > 1) return `vence em ${days} ${plural(days)}`;

  const late = -days;
  return `venceu há ${late} ${plural(late)}`;
}
