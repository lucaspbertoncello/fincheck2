import { useArchiveCategory } from '#/domain/categories/category/hooks/use-archive-category.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useUnarchiveCategory } from '#/domain/categories/category/hooks/use-unarchive-category.hook.ts';
import { useArchiveTag } from '#/domain/categories/tag/hooks/use-archive-tag.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { useUnarchiveTag } from '#/domain/categories/tag/hooks/use-unarchive-tag.hook.ts';

/**
 * What the Categorias screen reads and writes: every category and every tag (archived ones too,
 * the screen filters), and the four archive moves. Create and edit live in the two modals.
 */
export function useCategoryListModel() {
  return {
    categories: useCategories({ status: 'all' }),
    tags: useTags({ includeArchived: true }),
    archiveCategory: useArchiveCategory(),
    unarchiveCategory: useUnarchiveCategory(),
    archiveTag: useArchiveTag(),
    unarchiveTag: useUnarchiveTag(),
  };
}
