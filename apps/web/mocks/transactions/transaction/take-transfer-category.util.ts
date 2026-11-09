import type { MockState } from '#mocks/state/mock-state.type.ts';

// The category that is a transfer lands on the transaction: it becomes a `transfer` chosen by
// Lucas (or set by a rule) and keeps the category. One that already was a transfer keeps the other
// leg; one that was not has none (`Transaction.assignCategory`).
export function takeTransferCategory(
  tx: MockState.TransactionRecord,
  categoryId: string,
  origin: { source: 'user' } | { source: 'rule'; ruleId: string },
): void {
  tx.nature = 'transfer';
  tx.natureSetBy = 'user';
  tx.categoryId = categoryId;
  tx.categorySource = origin.source;
  tx.categoryRuleId = origin.source === 'rule' ? origin.ruleId : null;
}
