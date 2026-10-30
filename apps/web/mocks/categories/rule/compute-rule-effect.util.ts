import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import { ruleMatches } from '#mocks/categories/rule/rule-matches.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

interface RuleDefinition {
  descriptionContains: string;
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
// transaction, never a category Lucas, a recurrence or a bill put, never one set by an older rule.
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
    // A rule of expenses never puts a category in an income.
    return !category || category.kind === tx.nature;
  });

  const olderRuleWins = (tx: MockState.TransactionRecord) => {
    const owner = database.rules.find((item) => item.id === tx.categoryRuleId);
    return owner !== undefined && owner.createdAt < ruleCreatedAt;
  };
  const tagIds = rule.tagIds ?? [];

  const changes = matches.filter((tx) => {
    if (!rule.categoryId && tagIds.length === 0) return true;
    const categoryFree = tx.categorySource === null || tx.categorySource === 'rule';
    const categoryChanges =
      Boolean(rule.categoryId) &&
      categoryFree &&
      !olderRuleWins(tx) &&
      tx.categoryId !== rule.categoryId;
    const tagsChange = tagIds.some((tagId) => !tx.tagIds.includes(tagId));

    return categoryChanges || tagsChange;
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
