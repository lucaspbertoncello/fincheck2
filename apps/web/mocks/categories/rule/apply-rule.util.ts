import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';

import { computeRuleEffect } from '#mocks/categories/rule/compute-rule-effect.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { toPreviousState } from '#mocks/transactions/transaction/to-previous-state.util.ts';

// Applies a rule to the history: category (when free) and tags (added) go to the matching
// transactions. Returns the "before" of each one that changed, for the undo.
export function applyRule(
  database: MockState.Database,
  rule: MockState.RuleRecord,
): { changedCount: number; previous: TransactionBulk.PreviousState[] } {
  const { changes } = computeRuleEffect(database, rule, rule.createdAt);
  const previous = changes.map(toPreviousState);

  for (const tx of changes) {
    const categoryFree = tx.categorySource === null || tx.categorySource === 'rule';
    const owner = database.rules.find((item) => item.id === tx.categoryRuleId);
    const olderRuleWins = owner !== undefined && owner.createdAt < rule.createdAt;
    if (rule.categoryId && categoryFree && !olderRuleWins) {
      tx.categoryId = rule.categoryId;
      tx.categorySource = 'rule';
      tx.categoryRuleId = rule.id;
    }
    tx.tagIds = [...new Set([...tx.tagIds, ...rule.tagIds])];
    tx.updatedAt = NOW_ISO;
  }

  return { changedCount: changes.length, previous };
}
