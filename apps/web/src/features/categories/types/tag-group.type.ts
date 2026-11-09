import type { TagItem } from '@fincheck/ui';

/** The tags of one category, as the Tags part of Categorias shows them. */
export type TagGroup = {
  categoryId: string;
  name: string;
  kind: 'expense' | 'income';
  tags: TagItem[];
  archivedTags: TagItem[];
  /** False in an archived category: a tag created there could not be used. */
  canCreate: boolean;
};
