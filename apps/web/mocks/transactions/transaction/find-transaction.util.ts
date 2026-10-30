import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

export function findTransaction(
  database: MockState.Database,
  id: string,
): MockState.TransactionRecord {
  return (
    database.transactions.find((tx) => tx.id === id) ??
    fail(404, 'TRANSACTION_NOT_FOUND', 'A transação não existe')
  );
}
