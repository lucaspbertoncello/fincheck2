import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { TagItem } from '@fincheck/ui';

export function toTagItem(tag: Tag.Dto): TagItem {
  return {
    id: tag.id,
    name: tag.name,
    transactionCount: tag.transactionCount,
    archived: tag.archivedAt !== null,
  };
}
