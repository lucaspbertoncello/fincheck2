import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { InvoiceTone } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

/** The words and the color of each state of the invoice (BR-INV-006: aberta, fechada, paga). */
export const INVOICE_STATUS_LABELS: Record<Invoice.Status, { label: string; tone: InvoiceTone }> = {
  open: { label: 'Fatura aberta', tone: 'accent' },
  projected: { label: 'Fatura projetada', tone: 'neutral' },
  closed: { label: 'Fatura fechada', tone: 'neutral' },
  partial: { label: 'Paga em parte', tone: 'warn' },
  overdue: { label: 'Vencida', tone: 'warn' },
  paid: { label: 'Fatura paga', tone: 'ok' },
};
