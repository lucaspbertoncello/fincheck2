import { useTagFormViewModel } from '#/features/categories/tag-form/tag-form.viewmodel.tsx';
import { TagFormView } from '#/features/categories/tag-form/tag-form.view.tsx';
import type { TagFormTarget } from '#/features/categories/types/tag-form.type.ts';

type TagFormProps = {
  /** What to open; null keeps it closed. */
  target: TagFormTarget | null;
  onClose: () => void;
  onArchive?: (id: string) => void;
};

function OpenTagForm(props: TagFormProps & { target: TagFormTarget }) {
  return <TagFormView {...useTagFormViewModel(props)} />;
}

/** The tag modal, mounted fresh for each target. */
export function TagForm({ target, ...handlers }: TagFormProps) {
  if (!target) return null;

  return (
    <OpenTagForm
      key={target.mode === 'rename' ? target.tag.id : 'new'}
      target={target}
      {...handlers}
    />
  );
}
