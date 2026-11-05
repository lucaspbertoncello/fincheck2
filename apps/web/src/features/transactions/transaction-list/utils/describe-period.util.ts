import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

/** The words for the period before, in "R$ 100 a mais que ___": null when there is none (Tudo). */
export function describePreviousPeriod(
  period: TransactionPeriod,
  range: PeriodRange,
): string | null {
  if (period === '12m') return 'os 12 meses antes';
  if (period === 'year' && range.from) return String(Number(range.from.slice(0, 4)) - 1);

  return null;
}

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

/** What the legend under the income bar says for a period. */
export function describeReceivedIn(period: TransactionPeriod): string {
  if (period === '12m') return 'Recebido nos últimos 12 meses';
  if (period === 'year') return 'Recebido no ano';

  return 'Recebido em todo o histórico';
}
