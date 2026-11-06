import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

// BR-CAT-006, N9: a rule applied to the history never overwrites a category that Lucas, a
// recurrence or a bill put, nor one that an older rule set (the oldest rule wins). A category of
// a rule that is gone left no id (`SET NULL`), so it is free again.
export function canRuleSetCategory(
  current: {
    categorySource: TransactionContract.CategorySource | null;
    categoryRuleId: string | null;
  },
  olderRuleIds: ReadonlySet<string>,
): boolean {
  if (current.categorySource !== null && current.categorySource !== 'rule') return false;

  return current.categoryRuleId === null || !olderRuleIds.has(current.categoryRuleId);
}
