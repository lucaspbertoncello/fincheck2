import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { CategoryTab } from '#/features/categories/types/category-tab.type.ts';
import { belongsToCategoryTab } from '#/features/categories/utils/belongs-to-category-tab.util.ts';

/** The categories of one tab (Despesas, Receitas, Arquivadas), narrowed by the search text. */
export function filterCategories(
  categories: readonly Category.Dto[],
  filter: CategoryTab,
  search: string,
): Category.Dto[] {
  const needle = normalizeText(search);

  return categories.filter(
    (category) =>
      belongsToCategoryTab(category, filter) &&
      (!needle || normalizeText(category.name).includes(needle)),
  );
}
