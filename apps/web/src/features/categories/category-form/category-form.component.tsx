import { useCategoryFormViewModel } from '#/features/categories/category-form/category-form.viewmodel.tsx';
import { CategoryFormView } from '#/features/categories/category-form/category-form.view.tsx';
import type { CategoryFormTarget } from '#/features/categories/types/category-form.type.ts';

type CategoryFormProps = {
  /** What to open; null keeps it closed. */
  target: CategoryFormTarget | null;
  onClose: () => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
};

function OpenCategoryForm(props: CategoryFormProps & { target: CategoryFormTarget }) {
  return <CategoryFormView {...useCategoryFormViewModel(props)} />;
}

/** The category modal, mounted fresh for each target so the form never keeps an old draft. */
export function CategoryForm({ target, ...handlers }: CategoryFormProps) {
  if (!target) return null;

  const key = target.mode === 'edit' ? target.category.id : `new-${target.kind}`;
  return <OpenCategoryForm key={key} target={target} {...handlers} />;
}
