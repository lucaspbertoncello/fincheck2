import type { CategoryOption } from '@fincheck/ui';

import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

/** The id of the "Sem categoria" choice: a form value, never sent to the API. */
export const NO_CATEGORY_ID = 'none';

/** The active categories of one type as choices, with "Sem categoria" first. */
export function useCategoryOptions(kind: 'expense' | 'income'): CategoryOption[] {
  const { data } = useCategories({ kind, status: 'active' });

  return [
    { id: NO_CATEGORY_ID, name: 'Sem categoria', icon: 'tag' },
    ...(data?.items ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      icon: mapCategoryIcon(category.icon),
    })),
  ];
}
