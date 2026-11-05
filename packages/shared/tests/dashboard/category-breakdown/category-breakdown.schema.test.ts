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
    incomes: { receivedCents: 0, expectedCents: 0, items: [] },
  };

  it('reads all the history: no month, no comparison, no variation', () => {
    expect(categoryBreakdownDtoSchema.safeParse(allHistory).success).toBe(true);
  });
});
