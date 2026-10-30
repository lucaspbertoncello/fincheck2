import { useTagFormViewModel } from '#/features/categories/tag-form/tag-form.viewmodel.tsx';
import { TagFormView } from '#/features/categories/tag-form/tag-form.view.tsx';
import type { TagFormTarget } from '#/features/categories/tag-form/types/tag-form.type.ts';

type TagFormProps = {
  /** What to open; null keeps it closed. */
  target: TagFormTarget | null;
  onClose: () => void;
};

function OpenTagForm({ target, onClose }: { target: TagFormTarget; onClose: () => void }) {
  return <TagFormView {...useTagFormViewModel({ target, onClose })} />;
}

/** The tag modal, mounted fresh for each target. */
export function TagForm({ target, onClose }: TagFormProps) {
  if (!target) return null;

  return (
    <OpenTagForm
      key={target.mode === 'rename' ? target.tag.id : 'new'}
      target={target}
      onClose={onClose}
    />
  );
}
