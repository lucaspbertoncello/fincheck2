import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';

type Extras = Pick<
  Invoice.DetailDto,
  'categoryBreakdown' | 'previousTotalCents' | 'highlights' | 'nextInvoiceCommittedCents'
>;

type TransactionItem = Extract<Invoice.Item, { type: 'transaction' }>;

// Where the money went: one entry per category, refunds taken off, the biggest first. Only the
// lines the card really has count (the expected recurrences have no category in the invoice).
function buildCategoryBreakdown(items: TransactionItem[]): Invoice.CategoryShare[] {
  const groups = new Map<string | null, { totalCents: number; itemCount: number }>();
  for (const item of items) {
    const group = groups.get(item.categoryId) ?? { totalCents: 0, itemCount: 0 };
    group.totalCents -= item.amountCents;
    group.itemCount += 1;
    groups.set(item.categoryId, group);
  }
  const kept = [...groups.entries()].filter(([, group]) => group.totalCents > 0);
  const sum = kept.reduce((total, [, group]) => total + group.totalCents, 0);

  return kept
    .map(([categoryId, group]) => ({
      categoryId,
      totalCents: group.totalCents,
      sharePercent: Math.round((group.totalCents / sum) * 1000) / 10,
      itemCount: group.itemCount,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

function buildHighlights(items: TransactionItem[]): Invoice.Highlights {
  const purchases = items.filter((item) => item.amountCents < 0);
  const largest = purchases.reduce<TransactionItem | null>(
    (best, item) => (best === null || item.amountCents < best.amountCents ? item : best),
    null,
  );
  const endingInstallments = items.flatMap((item) =>
    item.installment && item.installment.number === item.installment.count && item.amountCents < 0
      ? [
          {
            transactionId: item.transactionId,
            title: item.description,
            cents: -item.amountCents,
            number: item.installment.number,
            total: item.installment.count,
          },
        ]
      : [],
  );

  return {
    largestItem: largest
      ? {
          transactionId: largest.transactionId,
          title: largest.description,
          cents: -largest.amountCents,
        }
      : null,
    endingInstallments,
  };
}

// The fields BR-INV-006 adds to the invoice detail, summed here so the front only draws them.
export function buildInvoiceDetailExtras(
  database: MockState.Database,
  accountId: string,
  month: string,
  items: Invoice.Item[],
): Extras {
  const transactions = items.filter((item): item is TransactionItem => item.type === 'transaction');
  const previous = computeInvoice(database, accountId, addMonths(month, -1));
  const hasPrevious =
    previous.items.length > 0 ||
    database.invoices.some(
      (row) => row.accountId === accountId && row.month === previous.dto.month,
    );
  const next = computeInvoice(database, accountId, addMonths(month, 1)).dto.breakdown;

  return {
    categoryBreakdown: buildCategoryBreakdown(transactions),
    previousTotalCents: hasPrevious ? previous.dto.totalCents : null,
    highlights: buildHighlights(transactions),
    nextInvoiceCommittedCents: Math.max(0, next.installmentsCents + next.expectedRecurringCents),
  };
}
