import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';

import type { TagGroup } from '#/features/categories/types/tag-group.type.ts';
import { toTagItem } from '#/features/categories/utils/to-tag-item.util.ts';

const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/**
 * The tags grouped by their category: expense categories first, then income, each by name. Every
 * active category has a group (it is where a tag is born, even when empty); an archived category
 * only has one while it still holds tags.
 */
export function buildTagGroups(
  categories: readonly Category.Dto[],
  tags: readonly Tag.Dto[],
): TagGroup[] {
  return categories
    .map((category) => {
      const own = tags.filter((tag) => tag.categoryId === category.id);

      return {
        categoryId: category.id,
        name: category.name,
        kind: category.kind,
        tags: own.filter((tag) => tag.archivedAt === null).map(toTagItem),
        archivedTags: own.filter((tag) => tag.archivedAt !== null).map(toTagItem),
        canCreate: category.archivedAt === null,
      };
    })
    .filter((group) => group.canCreate || group.tags.length + group.archivedTags.length > 0)
    .sort(
      (a, b) =>
        (a.kind === b.kind ? 0 : a.kind === 'expense' ? -1 : 1) ||
        nameCollator.compare(a.name, b.name),
    );
}
