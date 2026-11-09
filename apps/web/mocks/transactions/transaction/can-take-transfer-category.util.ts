import type { MockState } from '#mocks/state/mock-state.type.ts';
import { buildTransactionLinks } from '#mocks/transactions/transaction/build-transaction-links.util.ts';

// Whether a whole expense or income may become a transfer by taking the category that is a
// transfer: the same locks the nature has (a split, a debt, an adjustment, a paid invoice, an
// occurrence or a bill), as a question (`Transaction.canTakeTransferCategory`).
export function canTakeTransferCategory(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): boolean {
  if (tx.splits.length > 0) return false;
  if (tx.nature !== 'expense' && tx.nature !== 'income') return false;
  const links = buildTransactionLinks(database, tx);

  return links.occurrence === null && links.bill?.role !== 'payment';
}
