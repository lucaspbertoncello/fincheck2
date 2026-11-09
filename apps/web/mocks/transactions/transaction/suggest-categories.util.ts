import { normalizeDescription } from '@fincheck/shared/common/text/normalize-description.util.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

interface CategorySuggestion {
  categoryId: string;
  reason: 'history' | 'rule';
}

// Up to 3 active categories of the right kind, as the API does it
// (`suggestCategoriesForDescription`): first the ones Lucas chose by hand for this description
// (without the "n/N" of an installment, most used first), then the ones a rule that is on points
// to. A rule counts only when it has a condition on the description and none on the sender or the
// account: the queue does not carry them.
export function suggestCategories(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
): CategorySuggestion[] {
  const kind = tx.amountCents < 0 ? 'expense' : 'income';
  const amount = Math.abs(tx.amountCents);
  // A credit on a card takes either kind, "Abate gasto" (expense) first.
  const isCardCredit =
    tx.amountCents > 0 && Boolean(findAccount(database, tx.accountId).creditCard);
  const kinds = isCardCredit ? (['expense', 'income'] as const) : ([kind] as const);
  const isUsable = (categoryId: string) =>
    database.categories.some(
      (category) =>
        category.id === categoryId &&
        kinds.some((one) => one === category.kind) &&
        !category.archivedAt,
    );

  const description = normalizeDescription(tx.description);
  const used = new Map<string, number>();
  for (const other of database.transactions) {
    if (other.id === tx.id || !other.categoryId || other.categorySource !== 'user') continue;
    if (other.ignoredAt || (other.nature !== 'expense' && other.nature !== 'income')) continue;
    if (normalizeDescription(other.description) !== description) continue;
    used.set(other.categoryId, (used.get(other.categoryId) ?? 0) + 1);
  }

  const suggestions: CategorySuggestion[] = [...used.entries()]
    .filter(([categoryId]) => isUsable(categoryId))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([categoryId]) => ({ categoryId, reason: 'history' }));

  const oldestFirst = [...database.rules].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  for (const rule of oldestFirst) {
    if (!rule.enabled || !rule.categoryId || !rule.descriptionContains) continue;
    if (rule.counterpartyContains || rule.accountId) continue;
    if (!description.includes(normalizeText(rule.descriptionContains))) continue;
    if (rule.kind && !kinds.some((one) => one === rule.kind)) continue;
    if (rule.amountMinCents != null && amount < rule.amountMinCents) continue;
    if (rule.amountMaxCents != null && amount > rule.amountMaxCents) continue;
    if (!isUsable(rule.categoryId)) continue;
    if (suggestions.some((item) => item.categoryId === rule.categoryId)) continue;
    suggestions.push({ categoryId: rule.categoryId, reason: 'rule' });
  }

  const kindOf = (categoryId: string) =>
    database.categories.find((category) => category.id === categoryId)?.kind;
  if (isCardCredit) {
    suggestions.sort(
      (a, b) =>
        Number(kindOf(a.categoryId) === 'income') - Number(kindOf(b.categoryId) === 'income'),
    );
  }

  return suggestions.slice(0, 3);
}
