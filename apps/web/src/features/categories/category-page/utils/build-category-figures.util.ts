import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

export type CategoryFigures = {
  /** What was spent (expense) or received (income) in the period. */
  totalCents: number;
  transactionCount: number;
  /** Null only when the period has no transaction at all, so there is no month to divide by. */
  monthlyAverageCents: number | null;
};

type FiguresInput = {
  kind: Category.Kind;
  categoryId: string;
  period: TransactionPeriod;
  range: PeriodRange;
  today: string;
  breakdown: CategoryBreakdown.Dto;
};

/** Months between two `YYYY-MM`, both included. */
function monthsBetween(first: string, last: string): number {
  const [fy, fm] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  return (ly! - fy!) * 12 + (lm! - fm!) + 1;
}

/**
 * How many months the period counts for the average: the whole month, 12, the year until this month,
 * or, over all the history, from the first month with a transaction (`firstMonth`) to this month.
 */
function countMonths(input: FiguresInput): number | null {
  const { period, range, today, breakdown } = input;
  if (period === 'month') return 1;
  if (period === '12m') return 12;
  if (period === 'year' && range.from) {
    return range.from.slice(0, 4) === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12;
  }
  return breakdown.firstMonth ? monthsBetween(breakdown.firstMonth, today.slice(0, 7)) : null;
}

/** The three figures at the top of the category page, from the categories of the period. */
export function buildCategoryFigures(input: FiguresInput): CategoryFigures {
  const { kind, categoryId, breakdown } = input;
  const expense = breakdown.expenses.items.find((item) => item.categoryId === categoryId);
  const income = breakdown.incomes.items.find((item) => item.categoryId === categoryId);
  const item = kind === 'expense' ? expense : income;
  const totalCents = kind === 'expense' ? (expense?.spentCents ?? 0) : (income?.receivedCents ?? 0);
  const months = countMonths(input);

  return {
    totalCents,
    transactionCount: item?.transactionCount ?? 0,
    monthlyAverageCents: months === null ? null : Math.round(totalCents / months),
  };
}
