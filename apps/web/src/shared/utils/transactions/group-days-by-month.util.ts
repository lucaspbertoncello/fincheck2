import type { TransactionDay } from '#/shared/types/transactions/transaction-day.type.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

/** The days of one month under its heading ("Outubro 2026"). */
type TransactionMonth = {
  /** `YYYY-MM`. */
  key: string;
  label: string;
  /** Transactions of the month that are loaded. */
  count: number;
  days: TransactionDay[];
};

/**
 * Puts the days under their month, newest month first and newest day first inside it. The list
 * arrives page by page, and a day can get more rows on a later page; sorting here keeps the blocks
 * in order whatever the order the pages came in.
 */
export function groupDaysByMonth(days: readonly TransactionDay[]): TransactionMonth[] {
  const months = new Map<string, TransactionMonth>();

  for (const day of [...days].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = day.date.slice(0, 7);
    let month = months.get(key);
    if (!month) {
      const parts = formatMonthParts(key);
      month = { key, label: `${parts.monthLabel} ${parts.yearLabel}`, count: 0, days: [] };
      months.set(key, month);
    }
    month.days.push(day);
    month.count += day.count;
  }

  return [...months.values()];
}
