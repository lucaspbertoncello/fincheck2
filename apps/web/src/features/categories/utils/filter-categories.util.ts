import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { CategoryFilterKey } from '@fincheck/ui';

type CategoryTab = Exclude<CategoryFilterKey, 'tags'>;

function belongsTo(category: Category.Dto, filter: CategoryTab): boolean {
  if (filter === 'archived') return category.archivedAt !== null;
  return category.archivedAt === null && category.kind === filter;
}

/** The categories of one tab (Despesas, Receitas, Arquivadas), narrowed by the search text. */
export function filterCategories(
  categories: readonly Category.Dto[],
  filter: CategoryTab,
  search: string,
): Category.Dto[] {
  const needle = normalizeText(search);

  return categories.filter(
    (category) =>
      belongsTo(category, filter) && (!needle || normalizeText(category.name).includes(needle)),
  );
}

/** The numbers on the tabs: "Despesas 12 | Receitas 5 | Arquivadas 2" (whole list, not the search). */
export function countCategoriesByFilter(
  categories: readonly Category.Dto[],
): Record<CategoryTab, number> {
  return {
    expense: categories.filter((category) => belongsTo(category, 'expense')).length,
    income: categories.filter((category) => belongsTo(category, 'income')).length,
    archived: categories.filter((category) => belongsTo(category, 'archived')).length,
  };
}
