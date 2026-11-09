import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import { ruleMatches } from '#mocks/categories/rule/rule-matches.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

interface RuleDefinition {
  descriptionContains?: string | null | undefined;
  counterpartyContains?: string | null | undefined;
  kind?: 'expense' | 'income' | null | undefined;
  accountId?: string | null | undefined;
  amountMinCents?: number | null | undefined;
  amountMaxCents?: number | null | undefined;
  categoryId?: string | null | undefined;
  tagIds?: string[] | undefined;
}

interface RuleEffect {
  matches: MockState.TransactionRecord[];
  changes: MockState.TransactionRecord[];
  examples: Rule.Example[];
}

// What a rule matches in the history and what applying it would change: never a split or ignored
// transaction. What Lucas, a recurrence or a bill categorized is not touched by any rule, category
// or tags (PM, 06/11); a category set by an older rule stays. With no action at all (the preview of
// a rule not finished) every match counts as a change.
export function computeRuleEffect(
  database: MockState.Database,
  rule: RuleDefinition,
  ruleCreatedAt: string,
): RuleEffect {
  const category = rule.categoryId
    ? database.categories.find((item) => item.id === rule.categoryId)
    : undefined;

  const matches = database.transactions.filter((tx) => {
    if (tx.ignoredAt || tx.splits.length > 0 || !ruleMatches(rule, tx)) return false;
    // A rule of expenses never puts a category in an income; the category that is a transfer
    // sees both directions (the outgoing and the incoming leg of a rotation).
    return !category || category.isTransfer || category.kind === tx.nature;
  });

  const olderRuleWins = (tx: MockState.TransactionRecord) => {
    const owner = database.rules.find((item) => item.id === tx.categoryRuleId);
    return owner !== undefined && owner.createdAt < ruleCreatedAt;
  };
  const tagIds = rule.tagIds ?? [];

  const changes = matches.filter((tx) => {
    if (!rule.categoryId && tagIds.length === 0) return true;
    // Put by hand, by a recurrence or by a bill: no rule touches it.
    if (tx.categorySource !== null && tx.categorySource !== 'rule') return false;
    // The tags of a rule go with the category it puts: with no category there is nothing to do.
    if (!rule.categoryId) return false;
    const tagsChange = tagIds.some((tagId) => !tx.tagIds.includes(tagId));
    if (olderRuleWins(tx)) return false;

    return tx.categoryId !== rule.categoryId || tagsChange;
  });

  const examples = [...changes]
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
    .slice(0, 3)
    .map((tx) => ({
      transactionId: tx.id,
      description: tx.description,
      occurredOn: tx.occurredOn,
      amountCents: tx.amountCents,
      fromCategoryId: tx.categoryId,
      toCategoryId: rule.categoryId ?? null,
    }));

  return { matches, changes, examples };
}
