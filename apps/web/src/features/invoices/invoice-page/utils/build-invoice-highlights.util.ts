import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { InvoiceHighlightsData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

/** The highlights as the page draws them: the biggest purchase, what ends here, what the next invoice has. */
export function buildInvoiceHighlights(invoice: Invoice.DetailDto): InvoiceHighlightsData {
  const { highlights } = invoice;

  return {
    largest: highlights.largestItem
      ? { title: highlights.largestItem.title, cents: highlights.largestItem.cents }
      : null,
    ending: highlights.endingInstallments.map((item) => ({
      key: item.transactionId,
      title: item.title,
      cents: item.cents,
      partLabel: `${item.number}/${item.total}`,
    })),
    nextLabel: `${formatMonthParts(shiftMonthKey(invoice.month, 1)).monthLabel} já começa com`,
    nextCents: invoice.nextInvoiceCommittedCents,
  };
}
