import type { CategoryOption } from '@fincheck/ui';

/**
 * Orders categories by how many of the given transactions use them, most used first. A tie, and a
 * category nobody used yet, keep the order they came in, so the shortcuts are stable. Groups keep
 * the order they came in (the first one's first): the ranking is inside each.
 */
export function rankCategoriesByUse(
  categories: readonly CategoryOption[],
  transactions: readonly { categoryId: string | null }[],
): CategoryOption[] {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.categoryId) {
      counts.set(transaction.categoryId, (counts.get(transaction.categoryId) ?? 0) + 1);
    }
  }
  const groups = [...new Set(categories.map((category) => category.group))];

  return categories
    .map((category, index) => ({
      category,
      index,
      group: groups.indexOf(category.group),
      count: counts.get(category.id) ?? 0,
    }))
    .sort((a, b) => a.group - b.group || b.count - a.count || a.index - b.index)
    .map(({ category }) => category);
}
