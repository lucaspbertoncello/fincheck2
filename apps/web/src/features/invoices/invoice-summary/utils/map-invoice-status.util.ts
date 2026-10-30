import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { InvoiceStatus } from '@fincheck/ui';

/**
 * The looks of the invoice card: open (and projected), closed, partial, overdue and paid. The due
 * line says the rest.
 */
export function mapInvoiceStatus(status: Invoice.Status): InvoiceStatus {
  if (status === 'projected') return 'open';
  return status;
}
