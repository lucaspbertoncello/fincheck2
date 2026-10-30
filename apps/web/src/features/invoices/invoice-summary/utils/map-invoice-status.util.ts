import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { InvoiceStatus } from '@fincheck/ui';

/**
 * The three looks of the invoice card: open (and projected), closed (also partial and overdue,
 * which the due line explains) and paid.
 */
export function mapInvoiceStatus(status: Invoice.Status): InvoiceStatus {
  if (status === 'paid') return 'paid';
  if (status === 'open' || status === 'projected') return 'open';
  return 'closed';
}
