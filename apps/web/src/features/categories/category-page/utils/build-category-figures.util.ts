import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

export type CategoryFigures = {
  /** What was spent (expense) or received (income) in the period. */
  totalCents: number;
  /** Null where the contract has no count for the period (an income category outside the 12 months). */
  transactionCount: number | null;
  /** Null where the period has no length to divide by ("Tudo"). */
  monthlyAverageCents: number | null;
};

type FiguresInput = {
  kind: Category.Kind;
  categoryId: string;
  period: TransactionPeriod;
  range: PeriodRange;
  today: string;
  breakdown: CategoryBreakdown.Dto;
  trend: CategoryBreakdown.Trend | undefined;
};

/** How many months the period counts for the average: the whole month, 12, or the year until this month. */
function countMonths(period: TransactionPeriod, range: PeriodRange, today: string): number | null {
  if (period === 'month') return 1;
  if (period === '12m') return 12;
  if (period === 'year' && range.from) {
    return range.from.slice(0, 4) === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12;
  }

  return null;
}

/**
 * The count of an income category: the categories read has it for expenses only, so an income count
 * is summed from the 12 months of the trend, and only where the period lies inside them.
 */
function countFromTrend(
  trend: CategoryBreakdown.Trend | undefined,
  range: PeriodRange,
): number | null {
  if (!trend || !range.from || !range.to) return null;
  const first = trend.months[0]?.month;
  if (!first || range.from.slice(0, 7) < first) return null;
  const inRange = trend.months.filter(
    (item) => item.month >= range.from!.slice(0, 7) && item.month <= range.to!.slice(0, 7),
  );

  return inRange.reduce((sum, item) => sum + item.transactionCount, 0);
}

/** The three figures at the top of the category page, from the categories of the period. */
export function buildCategoryFigures(input: FiguresInput): CategoryFigures {
  const { kind, categoryId, period, range, today, breakdown, trend } = input;
  const expense = breakdown.expenses.items.find((item) => item.categoryId === categoryId);
  const income = breakdown.incomes.items.find((item) => item.categoryId === categoryId);
  const totalCents = kind === 'expense' ? (expense?.spentCents ?? 0) : (income?.receivedCents ?? 0);
  const months = countMonths(period, range, today);

  return {
    totalCents,
    transactionCount:
      kind === 'expense' ? (expense?.transactionCount ?? 0) : countFromTrend(trend, range),
    monthlyAverageCents: months === null ? null : Math.round(totalCents / months),
  };
}
