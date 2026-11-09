import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

// Overdue and partial only while something is left to pay: an invoice that the presumed payment
// covers whole is waiting for the link, not late.
export function computeInvoiceAgendaState(invoice: Invoice.Dto): Agenda.Item['state'] {
  if (invoice.remainingCents <= 0) return 'upcoming';
  if (invoice.status === 'overdue') return 'overdue';
  if (invoice.status === 'partial') return 'partial';

  return 'upcoming';
}
