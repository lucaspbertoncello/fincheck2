import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import { useCategoryFormViewModel } from '#/shared/components/categories/category-form/category-form.viewmodel.tsx';
import { CategoryFormView } from '#/shared/components/categories/category-form/category-form.view.tsx';
import type { CategoryFormTarget } from '#/shared/types/categories/category-form.type.ts';

type CategoryFormProps = {
  /** What to open; null keeps it closed. */
  target: CategoryFormTarget | null;
  onClose: () => void;
  /** A category was created: it comes back, so a picker can choose it. The modal closes after. */
  onCreated?: (category: Category.Dto) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
};

function OpenCategoryForm(props: CategoryFormProps & { target: CategoryFormTarget }) {
  return <CategoryFormView {...useCategoryFormViewModel(props)} />;
}

/**
 * The category modal, mounted fresh for each target so the form never keeps an old draft. It opens
 * from the Categorias screen and from the pickers of a transaction, a bill and a recurrence ("Nova
 * categoria"), so it can sit inside another modal: React Aria stacks them (the focus goes back to
 * the field and Esc closes only the one on top), and the wrapper keeps the submit of this form from
 * bubbling, through the React tree, to the form of the modal behind.
 */
export function CategoryForm({ target, ...handlers }: CategoryFormProps) {
  if (!target) return null;

  const key = target.mode === 'edit' ? target.category.id : `new-${target.kind}`;
  return (
    <div className="contents" onSubmit={(event) => event.stopPropagation()}>
      <OpenCategoryForm key={key} target={target} {...handlers} />
    </div>
  );
}
