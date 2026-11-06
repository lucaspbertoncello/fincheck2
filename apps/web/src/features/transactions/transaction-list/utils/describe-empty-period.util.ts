import type { TransactionPeriod } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';
import type { PeriodRange } from '#/shared/types/transactions/period-range.type.ts';

/** The title of the empty screen for a period with nothing in it. */
export function describeEmptyPeriod(
  period: TransactionPeriod,
  range: PeriodRange,
  monthLabel: string,
): string {
  if (period === '12m') return 'Nenhuma transação nos últimos 12 meses';
  if (period === 'year' && range.from) {
    return `Nenhuma transação em ${range.from.slice(0, 4)} ainda`;
  }
  if (period === 'all') return 'Nenhuma transação ainda';

  return `Nenhuma transação em ${monthLabel} ainda`;
}
