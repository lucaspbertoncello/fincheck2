import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/types/period-range.type.ts';

/** The words for the period before, in "R$ 100 a mais que ___": null when there is none (Tudo). */
export function describePreviousPeriod(
  period: TransactionPeriod,
  range: PeriodRange,
): string | null {
  if (period === '12m') return 'os 12 meses antes';
  if (period === 'year' && range.from) return String(Number(range.from.slice(0, 4)) - 1);

  return null;
}
