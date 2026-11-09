import type { MockState } from '#mocks/state/mock-state.type.ts';

// Cuts the link of a transfer leg with the other leg, on both sides. The natures stay as they are.
export function unlinkTransfer(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): void {
  const other = database.transactions.find((item) => item.id === tx.transferCounterpartId);
  tx.transferCounterpartId = null;
  if (other && other.transferCounterpartId === tx.id) other.transferCounterpartId = null;
}
