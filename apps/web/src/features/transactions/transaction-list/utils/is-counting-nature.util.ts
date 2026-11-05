import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

/** True when the nature counts in the month (only expense and income do; BR-TRX-006). */
export function isCountingNature(nature: Transaction.Dto['nature']): boolean {
  return nature === 'expense' || nature === 'income';
}
