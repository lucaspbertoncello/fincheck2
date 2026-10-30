import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryOption } from '@fincheck/ui';

import { mapCategoryIcon } from '#/features/transactions/transaction-list/utils/map-category-icon.util.ts';

/** Active categories of one kind as the options the edit, split and bulk pickers show. */
export function buildCategoryOptions(
  categories: readonly Category.Dto[],
  kind: Category.Dto['kind'],
): CategoryOption[] {
  return categories
    .filter((category) => category.kind === kind && category.archivedAt === null)
    .map((category) => ({
      id: category.id,
      name: category.name,
      icon: mapCategoryIcon(category.icon),
    }));
}
