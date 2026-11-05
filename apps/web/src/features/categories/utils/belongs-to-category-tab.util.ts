import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import type { CategoryTab } from '#/features/categories/types/category-tab.type.ts';

/** Whether a category shows on a tab: active ones by kind, archived ones on their own tab. */
export function belongsToCategoryTab(category: Category.Dto, filter: CategoryTab): boolean {
  if (filter === 'archived') return category.archivedAt !== null;
  return category.archivedAt === null && category.kind === filter;
}
