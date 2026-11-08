import { describe, expect, it } from 'vitest';

import { computeInvoiceHighlights } from '#/modules/invoices/application/invoice/compute-invoice-highlights.util.ts';
import { buildTestCardInvoiceItem } from '#tests/support/invoices/invoice/build-test-card-invoice-item.util.ts';

const item = buildTestCardInvoiceItem;

describe('computeInvoiceHighlights: largestItem', () => {
  it('is null with no items', () => {
    expect(computeInvoiceHighlights([]).largestItem).toBeNull();
  });

  it('is null when there is only a refund', () => {
    expect(computeInvoiceHighlights([item({ amountCents: 5000 })]).largestItem).toBeNull();
  });

  it('is the most negative amount, as a positive value', () => {
    const result = computeInvoiceHighlights([
      item({ transactionId: 'a', description: 'Small', amountCents: -1000 }),
      item({ transactionId: 'b', description: 'Big', amountCents: -9000 }),
      item({ transactionId: 'c', description: 'Medium', amountCents: -4000 }),
    ]);

    expect(result.largestItem).toEqual({ transactionId: 'b', title: 'Big', cents: 9000 });
  });

  it('does not let a refund bigger than any purchase take the place', () => {
    const result = computeInvoiceHighlights([
      item({ transactionId: 'a', amountCents: -1000 }),
      item({ transactionId: 'b', amountCents: 50000 }),
    ]);

    expect(result.largestItem?.transactionId).toBe('a');
  });

  it('breaks a tie with the most recent date', () => {
    const older = item({ transactionId: 'z', amountCents: -5000, occurredOn: '2026-10-10' });
    const newer = item({ transactionId: 'a', amountCents: -5000, occurredOn: '2026-10-20' });

    expect(computeInvoiceHighlights([older, newer]).largestItem?.transactionId).toBe('a');
    expect(computeInvoiceHighlights([newer, older]).largestItem?.transactionId).toBe('a');
  });

  it('breaks a tie of date with the greater id', () => {
    const a = item({ transactionId: 'tx-a', amountCents: -5000, occurredOn: '2026-10-10' });
    const b = item({ transactionId: 'tx-b', amountCents: -5000, occurredOn: '2026-10-10' });

    expect(computeInvoiceHighlights([a, b]).largestItem?.transactionId).toBe('tx-b');
    expect(computeInvoiceHighlights([b, a]).largestItem?.transactionId).toBe('tx-b');
  });
});

describe('computeInvoiceHighlights: endingInstallments', () => {
  it('is empty with no installments', () => {
    expect(computeInvoiceHighlights([item({ amountCents: -1000 })]).endingInstallments).toEqual([]);
  });

  it('keeps only the installments whose number equals the count', () => {
    const result = computeInvoiceHighlights([
      item({ transactionId: 'a', amountCents: -1000, installment: { number: 2, count: 3 } }),
      item({
        transactionId: 'b',
        description: 'Last one',
        amountCents: -1500,
        installment: { number: 3, count: 3 },
      }),
      item({ transactionId: 'c', amountCents: -1000, installment: { number: 1, count: 3 } }),
    ]);

    expect(result.endingInstallments).toEqual([
      { transactionId: 'b', title: 'Last one', cents: 1500, number: 3, total: 3 },
    ]);
  });

  it('counts a plan of one installment as ending', () => {
    const result = computeInvoiceHighlights([
      item({ transactionId: 'a', amountCents: -1000, installment: { number: 1, count: 1 } }),
    ]);

    expect(result.endingInstallments).toHaveLength(1);
  });

  it('orders by value, biggest first', () => {
    const result = computeInvoiceHighlights([
      item({ transactionId: 'a', amountCents: -1000, installment: { number: 2, count: 2 } }),
      item({ transactionId: 'b', amountCents: -3000, installment: { number: 6, count: 6 } }),
      item({ transactionId: 'c', amountCents: -2000, installment: { number: 4, count: 4 } }),
    ]);

    expect(result.endingInstallments.map((entry) => entry.transactionId)).toEqual(['b', 'c', 'a']);
  });

  it('breaks a tie of value with the greater id', () => {
    const a = item({
      transactionId: 'tx-a',
      amountCents: -1000,
      installment: { number: 2, count: 2 },
    });
    const b = item({
      transactionId: 'tx-b',
      amountCents: -1000,
      installment: { number: 2, count: 2 },
    });

    expect(
      computeInvoiceHighlights([a, b]).endingInstallments.map((entry) => entry.transactionId),
    ).toEqual(['tx-b', 'tx-a']);
    expect(
      computeInvoiceHighlights([b, a]).endingInstallments.map((entry) => entry.transactionId),
    ).toEqual(['tx-b', 'tx-a']);
  });

  it('does not count a refund of the last installment', () => {
    const result = computeInvoiceHighlights([
      item({ amountCents: 1000, installment: { number: 3, count: 3 } }),
    ]);

    expect(result.endingInstallments).toEqual([]);
  });
});
