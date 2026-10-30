import { useState } from 'react';

import { useFocusFirstInvalid } from '#/features/categories/hooks/use-focus-first-invalid.hook.ts';
import { useTagFormModel } from '#/features/categories/tag-form/tag-form.model.ts';
import type { TagFormTarget } from '#/features/categories/tag-form/types/tag-form.type.ts';
import { validateTagName } from '#/features/categories/tag-form/utils/validate-tag-name.util.ts';
import { hasApiErrorCode } from '#/shared/api/api.error.ts';

type Options = {
  target: TagFormTarget;
  onClose: () => void;
};

/** State and submit of the tag modal. Mounted per target, so it starts fresh. */
export function useTagFormViewModel({ target, onClose }: Options) {
  const model = useTagFormModel();
  const renaming = target.mode === 'rename' ? target.tag : null;

  const [name, setName] = useState(renaming?.name ?? '');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const formRef = useFocusFirstInvalid(focusToken);

  async function submit() {
    setSubmitError(null);
    const result = validateTagName(name);
    if (!result.ok) {
      setError(result.error);
      setFocusToken((token) => token + 1);
      return;
    }
    setError(undefined);

    try {
      if (renaming) {
        if (result.name !== renaming.name) {
          await model.update.mutateAsync({ id: renaming.id, body: { name: result.name } });
        }
      } else {
        await model.create.mutateAsync({ name: result.name });
      }
      onClose();
    } catch (failure) {
      if (hasApiErrorCode(failure, 'TAG_NAME_TAKEN')) {
        setError('Já existe uma tag com esse nome.');
        setFocusToken((token) => token + 1);
      } else {
        setSubmitError('Não deu para salvar. Tente de novo.');
      }
    }
  }

  return {
    formRef,
    title: renaming ? 'Renomear tag' : 'Nova tag',
    subtitle: 'As transações e as regras que usam a tag continuam com ela.',
    submitLabel: renaming ? 'Salvar' : 'Criar tag',
    name,
    onNameChange: setName,
    error,
    submitError,
    isSaving: model.isSaving,
    onSubmit: () => void submit(),
    onClose,
  };
}
