import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

/** The transactions of one business day, with what its block header shows. */
export type TransactionDay = {
  date: string;
  title: string;
  dateLabel: string;
  /** Net of the transactions that count in the month (expense and income, not ignored). */
  totalCents: number;
  /** How many transactions the day has, also when the list shows only the first ones. */
  count: number;
  items: Transaction.Dto[];
};
