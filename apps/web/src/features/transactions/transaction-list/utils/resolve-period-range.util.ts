import type { PeriodRange } from '#/features/transactions/transaction-list/types/period-range.type.ts';
import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

function lastDayOf(monthKey: string): string {
  const [year = 0, month = 1] = monthKey.split('-').map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

/**
 * The range a period reads, from today (`YYYY-MM-DD`): "12 meses" is the 11 months before this one
 * and this one, whole months; "Este ano" is January to December of this year. The month and "Tudo"
 * have no range: the month is the app's, "Tudo" has no ends.
 */
export function resolvePeriodRange(period: TransactionPeriod, today: string): PeriodRange {
  const currentMonth = today.slice(0, 7);
  if (period === '12m') {
    return { from: `${shiftMonthKey(currentMonth, -11)}-01`, to: lastDayOf(currentMonth) };
  }
  if (period === 'year') {
    const year = today.slice(0, 4);

    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }

  return {};
}
