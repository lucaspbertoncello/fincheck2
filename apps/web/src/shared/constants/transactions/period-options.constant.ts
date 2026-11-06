import type { TransactionPeriod } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';

/** The period menu next to the month picker (BR-TRX-007); "Mês" is the month of the whole app. */
export const PERIOD_OPTIONS: readonly { key: TransactionPeriod; label: string }[] = [
  { key: 'month', label: 'Mês' },
  { key: '12m', label: '12 meses' },
  { key: 'year', label: 'Este ano' },
  { key: 'all', label: 'Tudo' },
];

/** How many transactions each page of a period list brings (the cursor asks for the next ones). */
export const PERIOD_PAGE_SIZE = 60;
