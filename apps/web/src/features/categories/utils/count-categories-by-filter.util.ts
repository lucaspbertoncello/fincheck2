import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import type { CategoryTab } from '#/features/categories/types/category-tab.type.ts';
import { belongsToCategoryTab } from '#/features/categories/utils/belongs-to-category-tab.util.ts';

/** The numbers on the tabs: "Despesas 12 | Receitas 5 | Arquivadas 2" (whole list, not the search). */
export function countCategoriesByFilter(
  categories: readonly Category.Dto[],
): Record<CategoryTab, number> {
  return {
    expense: categories.filter((category) => belongsToCategoryTab(category, 'expense')).length,
    income: categories.filter((category) => belongsToCategoryTab(category, 'income')).length,
    archived: categories.filter((category) => belongsToCategoryTab(category, 'archived')).length,
  };
}
