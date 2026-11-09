import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';

// The "before" of a transaction that a bulk action or a rule is about to change.
export function toPreviousState(tx: MockState.TransactionRecord): TransactionBulk.PreviousState {
  return {
    transactionId: tx.id,
    categoryId: tx.categoryId,
    categorySource: tx.categorySource,
    categoryRuleId: tx.categoryRuleId,
    tagIds: [...tx.tagIds],
    ignoredAt: tx.ignoredAt,
    natureSetBy: tx.natureSetBy,
  };
}
