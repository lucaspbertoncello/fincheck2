import type { TransactionPeriod } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';

/** What the legend under the income bar says for a period. */
export function describeReceivedIn(period: TransactionPeriod): string {
  if (period === '12m') return 'Recebido nos últimos 12 meses';
  if (period === 'year') return 'Recebido no ano';

  return 'Recebido em todo o histórico';
}
