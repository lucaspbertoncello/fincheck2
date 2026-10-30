import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import { ruleMatches } from '#mocks/categories/rule/rule-matches.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

interface CategorySuggestion {
  categoryId: string;
  reason: 'history' | 'rule';
}

// Up to 3 active categories of the right kind: first the ones Lucas already chose for this
// description (most used first), then the ones a rule would choose.
export function suggestCategories(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): CategorySuggestion[] {
  const kind = tx.amountCents < 0 ? 'expense' : 'income';
  const isUsable = (categoryId: string) =>
    database.categories.some(
      (category) => category.id === categoryId && category.kind === kind && !category.archivedAt,
    );

  const description = normalizeText(tx.description);
  const used = new Map<string, number>();
  for (const other of database.transactions) {
    if (other.id === tx.id || !other.categoryId) continue;
    if (normalizeText(other.description) !== description) continue;
    used.set(other.categoryId, (used.get(other.categoryId) ?? 0) + 1);
  }

  const suggestions: CategorySuggestion[] = [...used.entries()]
    .filter(([categoryId]) => isUsable(categoryId))
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId]) => ({ categoryId, reason: 'history' }));

  for (const rule of database.rules) {
    if (!rule.enabled || !rule.categoryId || !ruleMatches(rule, tx)) continue;
    if (!isUsable(rule.categoryId)) continue;
    if (suggestions.some((item) => item.categoryId === rule.categoryId)) continue;
    suggestions.push({ categoryId: rule.categoryId, reason: 'rule' });
  }

  return suggestions.slice(0, 3);
}
