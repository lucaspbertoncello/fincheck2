import type { PeriodRange } from '#/shared/types/transactions/period-range.type.ts';
import type { TransactionPeriod } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';
import { MONTH_SHORT_NAMES } from '#/shared/constants/date/month-names.constant.ts';

function monthYear(date: string): string {
  return `${MONTH_SHORT_NAMES[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/**
 * What the picker shows in the month's place: "dez 2025 – nov 2026", "2026" or "Tudo"; null for the
 * month, which the picker writes itself.
 */
export function formatPeriodRange(period: TransactionPeriod, range: PeriodRange): string | null {
  if (period === 'all') return 'Tudo';
  if (period === 'year' && range.from) return range.from.slice(0, 4);
  if (period === '12m' && range.from && range.to) {
    return `${monthYear(range.from)} – ${monthYear(range.to)}`;
  }

  return null;
}
