import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';

type Extras = Pick<
  Invoice.DetailDto,
  'categoryBreakdown' | 'previousTotalCents' | 'highlights' | 'nextInvoiceCommittedCents'
>;

type TransactionItem = Extract<Invoice.Item, { type: 'transaction' }>;

interface SpendingLine {
  categoryId: string | null;
  isLent: boolean;
  spentCents: number;
}

// The lines of spending of an item: the parts of a split transaction, or the transaction itself.
// Only an expense or what was lent is spending on a card; a transfer or an adjustment is not.
// `spentCents` is positive for a purchase and negative for a refund.
function explodeSpendingLines(database: MockState.Database, item: TransactionItem): SpendingLine[] {
  const tx = database.transactions.find((record) => record.id === item.transactionId);
  if (!tx) return [];
  const sources =
    tx.splits.length > 0
      ? tx.splits.map((part) => ({
          categoryId: part.categoryId,
          nature: part.nature,
          amountCents: part.amountCents,
        }))
      : [{ categoryId: tx.categoryId, nature: tx.nature, amountCents: tx.amountCents }];

  return sources.flatMap((source) => {
    const isLent = source.nature === 'lent' || source.nature === 'reimbursed';
    if (source.nature !== 'expense' && !isLent) return [];

    return [{ categoryId: source.categoryId, isLent, spentCents: -source.amountCents }];
  });
}

// Where the money went: one entry per category, refunds taken off, the biggest first. A split
// transaction counts by its parts; what was lent has a line of its own (null category, `isLent`).
// The expected recurrences are not here: they have no category in the invoice.
function buildCategoryBreakdown(
  database: MockState.Database,
  items: TransactionItem[],
): Invoice.CategoryShare[] {
  const buckets = new Map<
    string,
    { categoryId: string | null; isLent: boolean; totalCents: number; itemCount: number }
  >();
  for (const line of items.flatMap((item) => explodeSpendingLines(database, item))) {
    const key = line.isLent ? 'lent' : (line.categoryId ?? 'none');
    const bucket = buckets.get(key) ?? {
      categoryId: line.isLent ? null : line.categoryId,
      isLent: line.isLent,
      totalCents: 0,
      itemCount: 0,
    };
    bucket.totalCents += line.spentCents;
    bucket.itemCount += 1;
    buckets.set(key, bucket);
  }
  const kept = [...buckets.entries()].filter(([, bucket]) => bucket.totalCents > 0);
  const sum = kept.reduce((total, [, bucket]) => total + bucket.totalCents, 0);

  return kept
    .toSorted(([keyA, a], [keyB, b]) => b.totalCents - a.totalCents || keyA.localeCompare(keyB))
    .map(([, bucket]) => ({
      categoryId: bucket.categoryId,
      isLent: bucket.isLent,
      totalCents: bucket.totalCents,
      sharePercent: Math.round((bucket.totalCents * 1000) / sum) / 10,
      itemCount: bucket.itemCount,
    }));
}

function buildHighlights(items: TransactionItem[]): Invoice.Highlights {
  const purchases = items.filter((item) => item.amountCents < 0);
  // A tie on the amount goes to the most recent, then to the biggest id.
  const largest = purchases.toSorted(
    (a, b) =>
      a.amountCents - b.amountCents ||
      b.occurredOn.localeCompare(a.occurredOn) ||
      b.transactionId.localeCompare(a.transactionId),
  )[0];
  const endingInstallments = purchases
    .filter((item) => item.installment && item.installment.number === item.installment.count)
    .toSorted(
      (a, b) => a.amountCents - b.amountCents || b.transactionId.localeCompare(a.transactionId),
    )
    .flatMap((item) =>
      item.installment
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
    categoryBreakdown: buildCategoryBreakdown(database, transactions),
    previousTotalCents: hasPrevious ? previous.dto.totalCents : null,
    highlights: buildHighlights(transactions),
    nextInvoiceCommittedCents: Math.max(0, next.installmentsCents + next.expectedRecurringCents),
  };
}
