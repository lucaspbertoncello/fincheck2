import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import { explodeItemSpendingLines } from '#/modules/invoices/application/invoice/explode-item-spending-lines.util.ts';

type Bucket = { categoryId: string | null; isLent: boolean; cents: number; itemCount: number };

const LENT_KEY = 'lent';
const NO_CATEGORY_KEY = 'none';

// Where the money of the invoice went (BR-INV-006): one entry per category, expenses only, refunds
// taken off, biggest first. A split transaction counts by its parts, each on its own category. What
// was lent to a friend (a part, or a whole transaction, of nature `lent` or `reimbursed`) has a line
// of its own, "Emprestado", with a null category and `isLent: true`, apart from the purchases with no category. An
// entry that ends at zero or below (refunds bigger than the spending) is left out, since the
// contract has no negative share. The share is of what the entries sum to, with one decimal. The
// expected recurrences are not here: they already have their own field in the breakdown.
export function computeCategoryBreakdown(
  items: CardInvoiceTransactionReader.Item[],
): Invoice.CategoryShare[] {
  const buckets = new Map<string, Bucket>();

  for (const line of items.flatMap(explodeItemSpendingLines)) {
    const key = line.isLent ? LENT_KEY : (line.categoryId ?? NO_CATEGORY_KEY);
    const bucket = buckets.get(key) ?? {
      categoryId: line.isLent ? null : line.categoryId,
      isLent: line.isLent,
      cents: 0,
      itemCount: 0,
    };
    bucket.cents += line.spentCents;
    bucket.itemCount += 1;
    buckets.set(key, bucket);
  }

  const kept = [...buckets.entries()].filter(([, bucket]) => bucket.cents > 0);
  const base = kept.reduce((sum, [, bucket]) => sum + bucket.cents, 0);

  return kept
    .toSorted(([keyA, a], [keyB, b]) => b.cents - a.cents || keyA.localeCompare(keyB))
    .map(([, bucket]) => ({
      categoryId: bucket.categoryId,
      isLent: bucket.isLent,
      totalCents: bucket.cents,
      sharePercent: Math.round((bucket.cents * 1000) / base) / 10,
      itemCount: bucket.itemCount,
    }));
}
