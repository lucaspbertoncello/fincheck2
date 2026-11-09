import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryOption } from '@fincheck/ui';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

/**
 * Active categories of one kind as the options the edit, split and bulk pickers show.
 * `withTransfer` adds the category that is a transfer ("Rotação entre contas") whatever its kind:
 * it fits both legs of a rotation, the outgoing and the incoming one.
 */
export function buildCategoryOptions(
  categories: readonly Category.Dto[],
  kind: Category.Dto['kind'],
  options: { withTransfer?: boolean } = {},
): CategoryOption[] {
  return categories
    .filter(
      (category) =>
        (category.kind === kind || (options.withTransfer === true && category.isTransfer)) &&
        category.archivedAt === null,
    )
    .map((category) => ({
      id: category.id,
      name: category.name,
      icon: mapCategoryIcon(category.icon),
    }));
}
