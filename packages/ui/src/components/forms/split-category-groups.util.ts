import type { CategoryOption } from '#/components/transactions/category-option.type.ts';

type CategoryOptionGroup = {
  /** The heading; undefined for the options that came without a group. */
  label: string | undefined;
  options: CategoryOption[];
};

/** Splits the options by `group`, each group where its first option arrived, the order kept inside. */
export function splitCategoryGroups(categories: readonly CategoryOption[]): CategoryOptionGroup[] {
  const groups = new Map<string | undefined, CategoryOption[]>();
  for (const category of categories) {
    groups.set(category.group, [...(groups.get(category.group) ?? []), category]);
  }

  return [...groups].map(([label, options]) => ({ label, options }));
}
