import type { TransactionCursorKey } from '#mocks/transactions/transaction/encode-transaction-cursor.util.ts';

// The order of the list (transactions.md): competence, day, creation instant and id, newest first.
// Negative when `a` comes before `b`.
export function compareTransactionKeys(a: TransactionCursorKey, b: TransactionCursorKey): number {
  return (
    b[0].localeCompare(a[0]) ||
    b[1].localeCompare(a[1]) ||
    b[2].localeCompare(a[2]) ||
    b[3].localeCompare(a[3])
  );
}
