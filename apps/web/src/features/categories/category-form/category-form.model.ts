import { useCreateCategory } from '#/domain/categories/category/hooks/use-create-category.hook.ts';
import { useUpdateCategory } from '#/domain/categories/category/hooks/use-update-category.hook.ts';

/** What the category modal needs from the domain: the two writes. */
export function useCategoryFormModel() {
  const create = useCreateCategory();
  const update = useUpdateCategory();

  return { create, update, isSaving: create.isPending || update.isPending };
}
