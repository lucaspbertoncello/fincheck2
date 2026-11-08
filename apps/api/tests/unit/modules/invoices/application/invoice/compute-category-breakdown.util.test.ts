import { describe, expect, it } from 'vitest';

import { computeCategoryBreakdown } from '#/modules/invoices/application/invoice/compute-category-breakdown.util.ts';
import { buildTestCardInvoiceItem } from '#tests/support/invoices/invoice/build-test-card-invoice-item.util.ts';

const item = buildTestCardInvoiceItem;

describe('computeCategoryBreakdown', () => {
  it('returns nothing for no items', () => {
    expect(computeCategoryBreakdown([])).toEqual([]);
  });

  it('groups the expenses by category, counting the lines', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -3000, categoryId: 'food' }),
      item({ transactionId: 'b', amountCents: -1000, categoryId: 'food' }),
      item({ transactionId: 'c', amountCents: -4000, categoryId: 'market' }),
    ]);

    expect(result).toEqual([
      { categoryId: 'food', isLent: false, totalCents: 4000, sharePercent: 50, itemCount: 2 },
      { categoryId: 'market', isLent: false, totalCents: 4000, sharePercent: 50, itemCount: 1 },
    ]);
  });

  it('takes the refunds off the category and counts them as a line', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -10000, categoryId: 'food' }),
      item({ transactionId: 'b', amountCents: 3000, categoryId: 'food' }),
    ]);

    expect(result).toEqual([
      { categoryId: 'food', isLent: false, totalCents: 7000, sharePercent: 100, itemCount: 2 },
    ]);
  });

  it('leaves out a category whose refunds are bigger than its spending', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -1000, categoryId: 'food' }),
      item({ transactionId: 'b', amountCents: 5000, categoryId: 'food' }),
      item({ transactionId: 'c', amountCents: -3000, categoryId: 'market' }),
    ]);

    expect(result).toEqual([
      { categoryId: 'market', isLent: false, totalCents: 3000, sharePercent: 100, itemCount: 1 },
    ]);
  });

  it('leaves out a category that ends at exactly zero', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -1000, categoryId: 'food' }),
      item({ transactionId: 'b', amountCents: 1000, categoryId: 'food' }),
    ]);

    expect(result).toEqual([]);
  });

  it('does not count transfers, adjustments, invoice payments and incomes', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -2000, categoryId: 'food' }),
      item({ transactionId: 'b', amountCents: -9000, nature: 'transfer' }),
      item({ transactionId: 'c', amountCents: -9000, nature: 'balance_adjustment' }),
      item({ transactionId: 'd', amountCents: -9000, nature: 'invoice_payment' }),
      item({ transactionId: 'e', amountCents: 9000, nature: 'income', categoryId: 'salary' }),
    ]);

    expect(result).toEqual([
      { categoryId: 'food', isLent: false, totalCents: 2000, sharePercent: 100, itemCount: 1 },
    ]);
  });

  it('counts a split transaction by its parts, each on its own category', () => {
    const result = computeCategoryBreakdown([
      item({
        transactionId: 'a',
        amountCents: -3000,
        categoryId: 'ignored',
        parts: [
          { categoryId: 'food', amountCents: -1000, nature: 'expense' },
          { categoryId: 'market', amountCents: -2000, nature: 'expense' },
        ],
      }),
    ]);

    expect(result).toEqual([
      { categoryId: 'market', isLent: false, totalCents: 2000, sharePercent: 66.7, itemCount: 1 },
      { categoryId: 'food', isLent: false, totalCents: 1000, sharePercent: 33.3, itemCount: 1 },
    ]);
  });

  it('keeps a purchase with no category as its own entry with a null category', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -1000 }),
      item({ transactionId: 'b', amountCents: -500 }),
    ]);

    expect(result).toEqual([
      { categoryId: null, isLent: false, totalCents: 1500, sharePercent: 100, itemCount: 2 },
    ]);
  });

  it('puts what was lent on a line of its own, apart from the purchases with no category', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -3000 }),
      item({ transactionId: 'b', amountCents: -1000, nature: 'lent' }),
    ]);

    expect(result).toEqual([
      { categoryId: null, isLent: false, totalCents: 3000, sharePercent: 75, itemCount: 1 },
      { categoryId: null, isLent: true, totalCents: 1000, sharePercent: 25, itemCount: 1 },
    ]);
  });

  it('puts lent and reimbursed on the same line, the reimbursed one taking off', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -5000, nature: 'lent', categoryId: 'food' }),
      item({ transactionId: 'b', amountCents: 2000, nature: 'reimbursed' }),
    ]);

    expect(result).toEqual([
      { categoryId: null, isLent: true, totalCents: 3000, sharePercent: 100, itemCount: 2 },
    ]);
  });

  it('puts the lent part of a split transaction on the lent line and the rest on its category', () => {
    const result = computeCategoryBreakdown([
      item({
        transactionId: 'a',
        amountCents: -3000,
        parts: [
          { categoryId: 'food', amountCents: -2000, nature: 'expense' },
          { categoryId: null, amountCents: -1000, nature: 'lent' },
        ],
      }),
    ]);

    expect(result).toEqual([
      { categoryId: 'food', isLent: false, totalCents: 2000, sharePercent: 66.7, itemCount: 1 },
      { categoryId: null, isLent: true, totalCents: 1000, sharePercent: 33.3, itemCount: 1 },
    ]);
  });

  it('orders by total, biggest first', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -1000, categoryId: 'small' }),
      item({ transactionId: 'b', amountCents: -9000, categoryId: 'big' }),
      item({ transactionId: 'c', amountCents: -5000, categoryId: 'medium' }),
    ]);

    expect(result.map((share) => share.categoryId)).toEqual(['big', 'medium', 'small']);
  });

  it('orders a tie the same way whatever the order of the items', () => {
    const a = item({ transactionId: 'a', amountCents: -1000, categoryId: 'cat-a' });
    const b = item({ transactionId: 'b', amountCents: -1000, categoryId: 'cat-b' });

    const forward = computeCategoryBreakdown([a, b]).map((share) => share.categoryId);
    const backward = computeCategoryBreakdown([b, a]).map((share) => share.categoryId);

    expect(forward).toEqual(backward);
    expect(forward).toEqual(['cat-a', 'cat-b']);
  });

  it('rounds the share to one decimal over what the kept entries sum to', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -100, categoryId: 'one' }),
      item({ transactionId: 'b', amountCents: -100, categoryId: 'two' }),
      item({ transactionId: 'c', amountCents: -100, categoryId: 'three' }),
    ]);

    expect(result.map((share) => share.sharePercent)).toEqual([33.3, 33.3, 33.3]);
  });

  it('does not count a dropped entry in the base of the shares', () => {
    const result = computeCategoryBreakdown([
      item({ transactionId: 'a', amountCents: -2000, categoryId: 'food' }),
      item({ transactionId: 'b', amountCents: -2000, categoryId: 'market' }),
      item({ transactionId: 'c', amountCents: 9000, categoryId: 'refunded' }),
    ]);

    expect(result.map((share) => share.sharePercent)).toEqual([50, 50]);
  });
});
