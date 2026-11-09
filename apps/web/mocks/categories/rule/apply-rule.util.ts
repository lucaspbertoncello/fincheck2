import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';

import { canTakeTransferCategory } from '#mocks/transactions/transaction/can-take-transfer-category.util.ts';
import { takeTransferCategory } from '#mocks/transactions/transaction/take-transfer-category.util.ts';
import { computeRuleEffect } from '#mocks/categories/rule/compute-rule-effect.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { toPreviousState } from '#mocks/transactions/transaction/to-previous-state.util.ts';

// Applies a rule to the history: category (when free) and tags (added) go to the matching
// transactions. A tag archived after the rule was made is not added any more. Returns the "before"
// of each one that changed, for the undo.
export function applyRule(
  database: MockState.Database,
  rule: MockState.RuleRecord,
): { changedCount: number; previous: TransactionBulk.PreviousState[] } {
  const tagIds = rule.tagIds.filter(
    (tagId) => !database.tags.find((tag) => tag.id === tagId)?.archivedAt,
  );
  // The tags of a rule go with the category it puts: with no category there is nothing to do.
  if (!rule.categoryId) return { changedCount: 0, previous: [] };

  const category = database.categories.find((item) => item.id === rule.categoryId);
  const effect = computeRuleEffect(database, { ...rule, tagIds }, rule.createdAt);
  // What cannot become a transfer (an occurrence or a bill ties its nature) is left as it is.
  const changes = category?.isTransfer
    ? effect.changes.filter((tx) => canTakeTransferCategory(database, tx))
    : effect.changes;
  const previous = changes.map(toPreviousState);

  for (const tx of changes) {
    if (rule.categoryId && tx.categoryId !== rule.categoryId) {
      if (category?.isTransfer) {
        takeTransferCategory(tx, rule.categoryId, { source: 'rule', ruleId: rule.id });
      } else {
        tx.categoryId = rule.categoryId;
        tx.categorySource = 'rule';
        tx.categoryRuleId = rule.id;
        // The tags of the old category do not follow it.
        tx.tagIds = [];
      }
    }
    tx.tagIds = [...new Set([...tx.tagIds, ...tagIds])];
    tx.updatedAt = NOW_ISO;
  }

  return { changedCount: changes.length, previous };
}
