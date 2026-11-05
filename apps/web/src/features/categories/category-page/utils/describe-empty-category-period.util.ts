import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';

/** The title of the empty list of the category page ("Nenhuma transação em outubro de 2026"). */
export function describeEmptyCategoryPeriod(
  period: TransactionPeriod,
  monthText: string,
  yearText: string,
): string {
  if (period === '12m') return 'Nenhuma transação nos últimos 12 meses';
  if (period === 'year') return `Nenhuma transação em ${yearText}`;
  if (period === 'all') return 'Nenhuma transação nesta categoria ainda';

  return `Nenhuma transação em ${monthText}`;
}
