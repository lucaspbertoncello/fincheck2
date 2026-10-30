import type { MockState } from '#mocks/state/mock-state.type.ts';

// Edited = description, amount or date in use differ from what the bank sent. Never for a manual one.
export function isTransactionEdited(tx: MockState.TransactionRecord): boolean {
  if (!tx.bank) return false;

  return (
    tx.description !== tx.bank.description ||
    tx.amountCents !== tx.bank.amountCents ||
    tx.occurredOn !== tx.bank.occurredOn
  );
}
