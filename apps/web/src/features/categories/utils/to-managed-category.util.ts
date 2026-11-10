import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { ManagedCategory } from '@fincheck/ui';

import { describeArchivedCategory } from '#/shared/utils/categories/describe-archived-category.util.ts';
import { formatLastUsed } from '#/features/categories/utils/format-last-used.util.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

/** A category of the contract as a row of the management list. */
export function toManagedCategory(category: Category.Dto, today: string): ManagedCategory {
  const archived = category.archivedAt !== null;

  return {
    id: category.id,
    name: category.name,
    icon: mapCategoryIcon(category.icon),
    transactionCount: category.transactionCount,
    ruleCount: category.ruleCount,
    lastUsedLabel: formatLastUsed(category.lastUsedOn, today),
    archived,
    archivedNote: archived ? describeArchivedCategory(category) : undefined,
  };
}
