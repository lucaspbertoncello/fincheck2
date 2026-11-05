import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

const SHORT_MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

function monthYear(date: string): string {
  return `${SHORT_MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
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
