import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

// Port to the invoices of the active cards. `listUnpaid`: every one that is not paid (open, closed,
// partial or overdue), whatever its due date, with what it lacks already without the presumed
// payment. `listSettledIn`: the ones paid whose last payment is in the month (`YYYY-MM`). The owner
// is `invoices`.
export interface AgendaInvoiceReader {
  listUnpaid(): Promise<Invoice.OpenItem[]>;
  listSettledIn(month: string): Promise<Invoice.OpenItem[]>;
}
