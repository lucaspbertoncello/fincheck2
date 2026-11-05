import { describe, expect, it } from 'vitest';

import { buildCategoryFigures } from '#/features/categories/category-page/utils/build-category-figures.util.ts';
import { buildTrendBars } from '#/features/categories/category-page/utils/build-trend-bars.util.ts';
import { resolveCategoryRange } from '#/features/categories/category-page/utils/resolve-category-range.util.ts';

const TODAY = '2026-10-22';

describe('resolveCategoryRange', () => {
  it('gives the month of the app its whole range, leap February included', () => {
    expect(resolveCategoryRange('month', '2026-10', TODAY)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(resolveCategoryRange('month', '2028-02', TODAY).to).toBe('2028-02-29');
  });

  it('leaves the wider periods to Transações and gives "Tudo" no ends', () => {
    expect(resolveCategoryRange('12m', '2026-03', TODAY)).toEqual({
      from: '2025-11-01',
      to: '2026-10-31',
    });
    expect(resolveCategoryRange('year', '2026-03', TODAY)).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(resolveCategoryRange('all', '2026-03', TODAY)).toEqual({});
  });
});

describe('buildTrendBars', () => {
  const bars = buildTrendBars([
    { month: '2025-11', totalCents: 1000, transactionCount: 1 },
    { month: '2026-10', totalCents: 0, transactionCount: 0 },
  ]);

  it('labels the bar with the short month and the tip with the month in full', () => {
    expect(bars[0]).toMatchObject({
      key: '2025-11',
      label: 'nov',
      fullLabel: 'novembro de 2025',
      cents: 1000,
      detail: '1 transação',
    });
    expect(bars[1]?.detail).toBe('0 transações');
  });
});

describe('buildCategoryFigures', () => {
  const breakdown = {
    month: null,
    comparedUntilOn: null,
    firstMonth: null,
    expenses: {
      totalCents: 90000,
      previousTotalCents: null,
      topGrowth: null,
      items: [
        {
          categoryId: 'a',
          spentCents: 60000,
          previousSpentCents: null,
          changeCents: null,
          changePct: null,
          sharePct: 66.7,
          transactionCount: 6,
          latest: [],
        },
      ],
    },
    review: { count: 0, totalCents: 0 },
    incomes: {
      receivedCents: 500000,
      expectedCents: 500000,
      items: [
        {
          categoryId: 'b',
          receivedCents: 500000,
          expectedCents: 500000,
          transactionCount: 12,
          pending: [],
        },
      ],
    },
  };

  it('takes an expense category from the categories of the period', () => {
    const figures = buildCategoryFigures({
      kind: 'expense',
      categoryId: 'a',
      period: '12m',
      range: { from: '2025-11-01', to: '2026-10-31' },
      today: TODAY,
      breakdown,
    });

    expect(figures).toEqual({ totalCents: 60000, transactionCount: 6, monthlyAverageCents: 5000 });
  });

  it('is zero when the category is not in the period', () => {
    const figures = buildCategoryFigures({
      kind: 'expense',
      categoryId: 'zzz',
      period: 'month',
      range: { from: '2026-10-01', to: '2026-10-31' },
      today: TODAY,
      breakdown,
    });

    expect(figures).toEqual({ totalCents: 0, transactionCount: 0, monthlyAverageCents: 0 });
  });

  it('counts an income category from the categories of the period, like an expense', () => {
    const base = { kind: 'income' as const, categoryId: 'b', today: TODAY, breakdown };

    expect(
      buildCategoryFigures({
        ...base,
        period: '12m',
        range: { from: '2025-11-01', to: '2026-10-31' },
      }).transactionCount,
    ).toBe(12);
  });

  it('averages "Este ano" over the months gone and "Tudo" from the first month with data', () => {
    const base = { kind: 'income' as const, categoryId: 'b', today: TODAY, breakdown };

    expect(
      buildCategoryFigures({
        ...base,
        period: 'year',
        range: { from: '2026-01-01', to: '2026-12-31' },
      }).monthlyAverageCents,
    ).toBe(50000);
    // firstMonth 2026-01 to today (2026-10): 10 months.
    expect(
      buildCategoryFigures({
        ...base,
        breakdown: { ...breakdown, firstMonth: '2026-01' },
        period: 'all',
        range: {},
      }).monthlyAverageCents,
    ).toBe(50000);
    expect(
      buildCategoryFigures({ ...base, period: 'all', range: {} }).monthlyAverageCents,
    ).toBeNull();
  });
});
