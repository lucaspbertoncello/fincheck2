import { useCreateTag } from '#/domain/categories/tag/hooks/use-create-tag.hook.ts';
import { useUpdateTag } from '#/domain/categories/tag/hooks/use-update-tag.hook.ts';

/** What the tag modal needs from the domain: the two writes. */
export function useTagFormModel() {
  const create = useCreateTag();
  const update = useUpdateTag();

  return { create, update, isSaving: create.isPending || update.isPending };
}
