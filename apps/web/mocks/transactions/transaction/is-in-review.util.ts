import type { MockState } from '#mocks/state/mock-state.type.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// "Para revisar": counts in the month, has no category and is not split.
export function isInReview(tx: MockState.TransactionRecord): boolean {
  return (
    (tx.nature === 'expense' || tx.nature === 'income') &&
    countsInAccounts(tx) &&
    tx.categoryId === null &&
    tx.splits.length === 0
  );
}
