import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { useRef, useState } from 'react';

import { hasApiErrorCode } from '#/shared/api/api.error.ts';
import { useCategoryFormModel } from '#/shared/components/categories/category-form/category-form.model.ts';
import type {
  CategoryFormErrors,
  CategoryFormTarget,
} from '#/shared/types/categories/category-form.type.ts';
import { validateCategoryForm } from '#/shared/components/categories/category-form/utils/validate-category-form.util.ts';
import { CATEGORY_NAME_MAX_LENGTH } from '#/shared/constants/categories/category-name-length.constant.ts';
import { INVALID_FIELD_OR_STAND_IN_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';
import { describeArchivedCategory } from '#/shared/utils/categories/describe-archived-category.util.ts';
import { describeCategoryUsage } from '#/shared/components/categories/category-form/utils/describe-category-usage.util.ts';

type Options = {
  target: CategoryFormTarget;
  onClose: () => void;
  /** A category was created: hands it back, then the modal closes. */
  onCreated?: (category: Category.Dto) => void;
  /** Edit of an active category: closes this modal and asks for the archive confirmation. */
  onArchive?: (id: string) => void;
  /** Edit of an archived category: brings it back to the pickers. */
  onRestore?: (id: string) => void;
};

/** State and submit of the category modal. The modal is mounted per target, so it starts fresh. */
export function useCategoryFormViewModel({
  target,
  onClose,
  onCreated,
  onArchive,
  onRestore,
}: Options) {
  const model = useCategoryFormModel();
  const editing = target.mode === 'edit' ? target.category : null;

  const [name, setName] = useState(
    editing?.name ??
      (target.mode === 'create' ? (target.name ?? '').slice(0, CATEGORY_NAME_MAX_LENGTH) : ''),
  );
  const [icon, setIcon] = useState<Category.Icon>(editing?.icon ?? 'tag');
  const [kind, setKind] = useState<Category.Kind>(
    target.mode === 'create' ? target.kind : target.category.kind,
  );
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  useFocusFirstInvalid({
    attempt: focusToken,
    selector: INVALID_FIELD_OR_STAND_IN_SELECTOR,
    scope: formRef,
  });

  async function submit() {
    setSubmitError(null);
    const result = validateCategoryForm({ kind, name, icon });
    if (!result.ok) {
      setErrors(result.errors);
      setFocusToken((token) => token + 1);
      return;
    }
    setErrors({});

    try {
      if (editing) {
        const body: Category.UpdateRequest = {};
        if (result.body.name !== editing.name) body.name = result.body.name;
        if (result.body.icon !== editing.icon) body.icon = result.body.icon;
        if (Object.keys(body).length > 0) {
          await model.update.mutateAsync({ id: editing.id, body });
        }
      } else {
        const created = await model.create.mutateAsync(result.body);
        onCreated?.(created);
      }
      onClose();
    } catch (error) {
      if (hasApiErrorCode(error, 'CATEGORY_NAME_TAKEN')) {
        // A picker lists only the active ones, so from there the clash may be with an archived one.
        const fromPicker = target.mode === 'create' && target.name !== undefined;
        setErrors({
          name: fromPicker
            ? 'Já existe uma categoria com esse nome (pode estar arquivada).'
            : 'Já existe uma categoria com esse nome.',
        });
        setFocusToken((token) => token + 1);
      } else {
        setSubmitError('Não deu para salvar. Tente de novo.');
      }
    }
  }

  return {
    formRef,
    title: editing ? 'Editar categoria' : 'Nova categoria',
    subtitle: editing
      ? 'O tipo não muda depois de criada.'
      : ((target.mode === 'create' ? target.subtitle : undefined) ??
        'Aparece na escolha de categoria das transações.'),
    submitLabel: editing ? 'Salvar' : 'Criar categoria',
    canPickKind: target.mode === 'create' && !target.lockKind,
    kind,
    onKindChange: setKind,
    name,
    onNameChange: setName,
    icon,
    onIconChange: setIcon,
    errors,
    submitError,
    usage: editing ? describeCategoryUsage(editing) : null,
    isSaving: model.isSaving,
    onArchive:
      editing && editing.archivedAt === null && onArchive ? () => onArchive(editing.id) : null,
    restore:
      editing && editing.archivedAt !== null && onRestore
        ? {
            note: `Arquivada. ${describeArchivedCategory(editing)}`,
            onRestore: () => {
              onRestore(editing.id);
              onClose();
            },
          }
        : null,
    onSubmit: () => void submit(),
    onClose,
  };
}
