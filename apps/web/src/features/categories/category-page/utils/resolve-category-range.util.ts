import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import {
  resolvePeriodRange,
  type PeriodRange,
} from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

function lastDayOf(monthKey: string): string {
  const [year = 0, month = 1] = monthKey.split('-').map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

/**
 * The ends the category page reads, both included. Unlike Transações, "Mês" has a range here too
 * (the month of the app, whole), because the totals and the list ask by range. "Tudo" has none.
 */
export function resolveCategoryRange(
  period: TransactionPeriod,
  month: string,
  today: string,
): PeriodRange {
  if (period === 'month') return { from: `${month}-01`, to: lastDayOf(month) };

  return resolvePeriodRange(period, today);
}
