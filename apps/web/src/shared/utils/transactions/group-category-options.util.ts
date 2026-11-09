import type { CategoryOption } from '@fincheck/ui';

import { CREDIT_CATEGORY_GROUP_HINTS } from '#/shared/constants/transactions/credit-category-groups.constant.ts';

type CategoryOptionGroup = {
  /** The heading; null for options without a group. */
  label: string | null;
  /** What the group does to the credit, under its chips. */
  hint: string | null;
  categories: CategoryOption[];
};

/** The options split by `group`, each group where its first option came, for a list of chips. */
export function groupCategoryOptions(categories: readonly CategoryOption[]): CategoryOptionGroup[] {
  const groups = new Map<string | null, CategoryOption[]>();
  for (const category of categories) {
    const key = category.group ?? null;
    groups.set(key, [...(groups.get(key) ?? []), category]);
  }

  return [...groups].map(([label, options]) => ({
    label,
    hint: label ? (CREDIT_CATEGORY_GROUP_HINTS[label] ?? null) : null,
    categories: options,
  }));
}
