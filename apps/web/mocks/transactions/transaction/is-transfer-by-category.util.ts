import type { MockState } from '#mocks/state/mock-state.type.ts';

// The nature is `transfer` because of a category that is a transfer (`isTransfer`): only that one
// carries a category on a transfer (`Transaction.isTransferByCategory`).
export function isTransferByCategory(tx: MockState.TransactionRecord): boolean {
  return tx.nature === 'transfer' && tx.categoryId !== null;
}
