import type { MockState } from '#mocks/state/mock-state.type.ts';
import { isTransactionEdited } from '#mocks/transactions/transaction/is-transaction-edited.util.ts';

// "Enters the accounts": not ignored, and not removed by the bank unless Lucas edited it.
export function countsInAccounts(tx: MockState.TransactionRecord): boolean {
  if (tx.ignoredAt) return false;
  if (tx.removedByBankAt && !isTransactionEdited(tx)) return false;

  return true;
}
