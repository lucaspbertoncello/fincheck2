import type { MockState } from '#mocks/state/mock-state.type.ts';
import { unlinkTransfer } from '#mocks/transactions/transaction/unlink-transfer.util.ts';

// Ties two transactions as the legs of a transfer: each one lets go of the one it had before, and
// the other leg becomes a transfer chosen by Lucas, without a category.
export function linkTransferLegs(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
  other: MockState.TransactionRecord,
): void {
  unlinkTransfer(database, tx);
  unlinkTransfer(database, other);
  if (other.nature !== 'transfer') {
    other.nature = 'transfer';
    other.natureSetBy = 'user';
    other.categoryId = null;
    other.categorySource = null;
    other.categoryRuleId = null;
  }
  tx.transferCounterpartId = other.id;
  other.transferCounterpartId = tx.id;
}
