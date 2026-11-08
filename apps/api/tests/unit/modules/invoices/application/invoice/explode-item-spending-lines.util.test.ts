import { describe, expect, it } from 'vitest';

import { explodeItemSpendingLines } from '#/modules/invoices/application/invoice/explode-item-spending-lines.util.ts';
import { buildTestCardInvoiceItem } from '#tests/support/invoices/invoice/build-test-card-invoice-item.util.ts';

describe('explodeItemSpendingLines', () => {
  it('turns a purchase into a positive line of its category', () => {
    const lines = explodeItemSpendingLines(
      buildTestCardInvoiceItem({ amountCents: -3000, categoryId: 'food' }),
    );

    expect(lines).toEqual([{ categoryId: 'food', isLent: false, spentCents: 3000 }]);
  });

  it('turns a refund into a negative line', () => {
    const lines = explodeItemSpendingLines(
      buildTestCardInvoiceItem({ amountCents: 1000, categoryId: 'food' }),
    );

    expect(lines).toEqual([{ categoryId: 'food', isLent: false, spentCents: -1000 }]);
  });

  it('keeps a purchase with no category as a line with a null category', () => {
    const lines = explodeItemSpendingLines(buildTestCardInvoiceItem({ amountCents: -500 }));

    expect(lines).toEqual([{ categoryId: null, isLent: false, spentCents: 500 }]);
  });

  it.each(['lent', 'reimbursed'] as const)('marks a transaction of nature %s as lent', (nature) => {
    const lines = explodeItemSpendingLines(
      buildTestCardInvoiceItem({ amountCents: -2000, nature, categoryId: 'food' }),
    );

    expect(lines).toEqual([{ categoryId: 'food', isLent: true, spentCents: 2000 }]);
  });

  it.each(['transfer', 'balance_adjustment', 'invoice_payment', 'income'] as const)(
    'drops a transaction of nature %s',
    (nature) => {
      expect(explodeItemSpendingLines(buildTestCardInvoiceItem({ nature }))).toEqual([]);
    },
  );

  it('explodes a split transaction into its parts, ignoring the category of the transaction', () => {
    const lines = explodeItemSpendingLines(
      buildTestCardInvoiceItem({
        amountCents: -3000,
        categoryId: 'ignored',
        parts: [
          { categoryId: 'food', amountCents: -1000, nature: 'expense' },
          { categoryId: 'market', amountCents: -2000, nature: 'expense' },
        ],
      }),
    );

    expect(lines).toEqual([
      { categoryId: 'food', isLent: false, spentCents: 1000 },
      { categoryId: 'market', isLent: false, spentCents: 2000 },
    ]);
  });

  it('marks the lent parts of a split transaction and drops the parts that are not spending', () => {
    const lines = explodeItemSpendingLines(
      buildTestCardInvoiceItem({
        amountCents: -4000,
        parts: [
          { categoryId: 'food', amountCents: -1000, nature: 'expense' },
          { categoryId: null, amountCents: -2000, nature: 'lent' },
          { categoryId: null, amountCents: 500, nature: 'reimbursed' },
          { categoryId: 'salary', amountCents: 500, nature: 'income' },
        ],
      }),
    );

    expect(lines).toEqual([
      { categoryId: 'food', isLent: false, spentCents: 1000 },
      { categoryId: null, isLent: true, spentCents: 2000 },
      { categoryId: null, isLent: true, spentCents: -500 },
    ]);
  });
});
