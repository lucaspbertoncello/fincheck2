import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

export type TransactionCreateField = 'amount' | 'description' | 'date' | 'account' | 'method';

export type TransactionCreateValues = {
  type: 'expense' | 'income';
  amountCents: number;
  description: string;
  /** Business date, `YYYY-MM-DD`. */
  date: string;
  categoryId: string | null;
  accountId: string | null;
  method: Transaction.Method | null;
};

export type TransactionCreateErrors = Partial<Record<TransactionCreateField, string>>;
