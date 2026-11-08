import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';

export type SpendingLine = { categoryId: string | null; isLent: boolean; spentCents: number };

// The lines of spending of an item: the parts of a split transaction, or the transaction itself.
// Only an expense or what was lent is spending on a card; a transfer or an adjustment is not.
// `spentCents` is positive for a purchase and negative for a refund.
export function explodeItemSpendingLines(item: CardInvoiceTransactionReader.Item): SpendingLine[] {
  const sources =
    item.parts.length > 0
      ? item.parts.map((part) => ({
          categoryId: part.categoryId,
          nature: part.nature,
          amountCents: part.amountCents,
        }))
      : [{ categoryId: item.categoryId, nature: item.nature, amountCents: item.amountCents }];

  return sources.flatMap((source) => {
    const isLent = source.nature === 'lent' || source.nature === 'reimbursed';
    if (source.nature !== 'expense' && !isLent) return [];

    return [{ categoryId: source.categoryId, isLent, spentCents: -source.amountCents }];
  });
}
