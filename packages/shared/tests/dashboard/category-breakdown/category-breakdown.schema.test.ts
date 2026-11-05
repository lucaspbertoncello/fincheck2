import { describe, expect, it } from 'vitest';

import {
  categoryBreakdownDtoSchema,
  categoryBreakdownQuerySchema,
} from '#/dashboard/category-breakdown/category-breakdown.schema.ts';

describe('categoryBreakdownQuerySchema', () => {
  it('takes a month, a period with both ends, or nothing (all the history)', () => {
    expect(categoryBreakdownQuerySchema.safeParse({ month: '2026-10' }).success).toBe(true);
    expect(
      categoryBreakdownQuerySchema.safeParse({ from: '2025-11-01', to: '2026-10-31' }).success,
    ).toBe(true);
    expect(categoryBreakdownQuerySchema.safeParse({}).success).toBe(true);
  });

  it('wants from and to together, in order, and apart from the month', () => {
    expect(categoryBreakdownQuerySchema.safeParse({ from: '2026-01-01' }).success).toBe(false);
    expect(categoryBreakdownQuerySchema.safeParse({ to: '2026-01-01' }).success).toBe(false);
    expect(
      categoryBreakdownQuerySchema.safeParse({ from: '2026-02-01', to: '2026-01-31' }).success,
    ).toBe(false);
    expect(
      categoryBreakdownQuerySchema.safeParse({
        month: '2026-10',
        from: '2026-10-01',
        to: '2026-10-31',
      }).success,
    ).toBe(false);
  });
});

describe('categoryBreakdownDtoSchema', () => {
  const allHistory = {
    month: null,
    comparedUntilOn: null,
    firstMonth: '2025-11',
    expenses: {
      totalCents: 1000,
      previousTotalCents: null,
      items: [
        {
          categoryId: null,
          spentCents: 1000,
          previousSpentCents: null,
          changeCents: null,
          changePct: null,
          sharePct: 100,
          transactionCount: 1,
          latest: [],
        },
      ],
      topGrowth: null,
    },
    review: { count: 0, totalCents: 0 },
    incomes: {
      receivedCents: 500,
      expectedCents: 500,
      items: [
        {
          categoryId: null,
          receivedCents: 500,
          expectedCents: 500,
          transactionCount: 2,
          pending: [],
        },
      ],
    },
  };

  it('reads all the history: no month, no comparison, no variation', () => {
    expect(categoryBreakdownDtoSchema.safeParse(allHistory).success).toBe(true);
  });

  it('counts the income items and says the first month with data (null with none)', () => {
    expect(categoryBreakdownDtoSchema.safeParse({ ...allHistory, firstMonth: null }).success).toBe(
      true,
    );
    expect(
      categoryBreakdownDtoSchema.safeParse({ ...allHistory, firstMonth: undefined }).success,
    ).toBe(false);
    const noCount = {
      ...allHistory,
      incomes: {
        ...allHistory.incomes,
        items: [{ ...allHistory.incomes.items[0], transactionCount: undefined }],
      },
    };
    expect(categoryBreakdownDtoSchema.safeParse(noCount).success).toBe(false);
  });
});
