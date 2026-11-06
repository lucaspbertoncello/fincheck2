import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { getCycleProgress } from '#/domain/invoices/invoice/rules/get-cycle-progress.rule.ts';
import { INVOICE_STATUS_LABELS } from '#/features/invoices/invoice-page/constants/invoice-status.constant.ts';
import type { InvoiceSummaryData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';
import { computeInvoiceVariation } from '#/features/invoices/invoice-page/utils/compute-invoice-variation.util.ts';
import { describeInvoiceDue } from '#/features/invoices/invoice-page/utils/describe-invoice-due.util.ts';
import { buildInvoiceDueLine } from '#/domain/invoices/invoice/rules/build-invoice-due-line.rule.ts';

/** The cycle bar: running while open, full once closed, none when paid or not opened yet. */
function resolveCycleProgress(invoice: Invoice.Dto, today: string): number | undefined {
  if (invoice.status === 'open') return getCycleProgress(invoice.closesOn, today);
  if (['closed', 'partial', 'overdue'].includes(invoice.status)) return 1;

  return undefined;
}

/** The top of the invoice page, from the invoice and today (a business date). */
export function buildInvoiceSummary(invoice: Invoice.DetailDto, today: string): InvoiceSummaryData {
  const status = INVOICE_STATUS_LABELS[invoice.status];

  return {
    statusLabel: status.label,
    statusTone: status.tone,
    totalCents: invoice.totalCents,
    dueIn: describeInvoiceDue(invoice, today),
    // A paid invoice already says it in `dueIn` ("paga em 21/10").
    dueLine: invoice.status === 'paid' ? '' : buildInvoiceDueLine(invoice),
    cycleProgress: resolveCycleProgress(invoice, today),
    variation: computeInvoiceVariation(
      invoice.totalCents,
      invoice.previousTotalCents,
      invoice.month,
    ),
    remainingCents: invoice.remainingCents,
    canRegisterPayment: invoice.status !== 'projected' && invoice.remainingCents > 0,
    canCorrect: invoice.isEditable,
  };
}
