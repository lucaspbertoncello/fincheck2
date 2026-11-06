import { describe, expect, it } from 'vitest';

import { computeTransactionSummary } from '#/modules/transactions/application/transaction/compute-transaction-summary.util.ts';

type Line = Parameters<typeof computeTransactionSummary>[0][number];

const line = (overrides: Partial<Line>): Line => ({
  nature: 'expense',
  amountCents: -1000,
  isInReview: false,
  splits: [],
  ...overrides,
});

describe('computeTransactionSummary', () => {
  it('is all zeros without transactions', () => {
    expect(computeTransactionSummary([])).toEqual({
      expensesCents: 0,
      incomesCents: 0,
      outsideCents: 0,
      reviewCount: 0,
      reviewTotalCents: 0,
    });
  });

  it('adds expenses as a positive spending and incomes as positive income', () => {
    const summary = computeTransactionSummary([
      line({ amountCents: -1000 }),
      line({ amountCents: -250 }),
      line({ nature: 'income', amountCents: 5000 }),
    ]);

    expect(summary).toMatchObject({ expensesCents: 1250, incomesCents: 5000, outsideCents: 0 });
  });

  it('lets a refund (positive expense) lower the spending', () => {
    expect(
      computeTransactionSummary([line({ amountCents: -1000 }), line({ amountCents: 300 })])
        .expensesCents,
    ).toBe(700);
  });

  it('puts the five outside natures outside, by absolute value', () => {
    const summary = computeTransactionSummary([
      line({ nature: 'balance_adjustment', amountCents: -100 }),
      line({ nature: 'balance_adjustment', amountCents: 200 }),
      line({ nature: 'lent', amountCents: -300 }),
      line({ nature: 'reimbursed', amountCents: 400 }),
      line({ nature: 'transfer', amountCents: -500 }),
      line({ nature: 'invoice_payment', amountCents: -600 }),
    ]);

    expect(summary).toMatchObject({
      expensesCents: 0,
      incomesCents: 0,
      outsideCents: 100 + 200 + 300 + 400 + 500 + 600,
    });
  });

  it('counts only the leg that leaves of a transfer and of an invoice payment (N3)', () => {
    const summary = computeTransactionSummary([
      line({ nature: 'transfer', amountCents: -5000 }),
      line({ nature: 'transfer', amountCents: 5000 }),
      line({ nature: 'invoice_payment', amountCents: -8000 }),
      line({ nature: 'invoice_payment', amountCents: 8000 }),
    ]);

    expect(summary.outsideCents).toBe(13000);
  });

  it('counts a split transaction by its parts, and the parts of a friend outside', () => {
    const summary = computeTransactionSummary([
      line({
        amountCents: -6000,
        splits: [
          { nature: 'expense', amountCents: -2500 },
          { nature: 'lent', amountCents: -3500 },
        ],
      }),
      line({
        nature: 'income',
        amountCents: 1000,
        splits: [
          { nature: 'income', amountCents: 400 },
          { nature: 'reimbursed', amountCents: 600 },
        ],
      }),
    ]);

    expect(summary).toMatchObject({ expensesCents: 2500, incomesCents: 400, outsideCents: 4100 });
  });

  it('counts the ones in review and their absolute value', () => {
    const summary = computeTransactionSummary([
      line({ amountCents: -1000, isInReview: true }),
      line({ nature: 'income', amountCents: 400, isInReview: true }),
      line({ amountCents: -50 }),
    ]);

    expect(summary).toMatchObject({ reviewCount: 2, reviewTotalCents: 1400 });
  });

  it('loses no cent: spending, income and outside cover everything that is not a second leg', () => {
    const lines: Line[] = [
      line({ amountCents: -1234 }),
      line({ nature: 'income', amountCents: 9999 }),
      line({ nature: 'lent', amountCents: -777 }),
      line({ nature: 'transfer', amountCents: -4321 }),
      line({ nature: 'transfer', amountCents: 4321 }),
      line({
        amountCents: -1001,
        splits: [
          { nature: 'expense', amountCents: -501 },
          { nature: 'lent', amountCents: -500 },
        ],
      }),
    ];
    const summary = computeTransactionSummary(lines);

    expect(summary.expensesCents + summary.incomesCents + summary.outsideCents).toBe(
      1234 + 9999 + 777 + 4321 + 1001,
    );
  });
});
