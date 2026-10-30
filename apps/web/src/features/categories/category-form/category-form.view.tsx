import { Button, Modal, SegmentedControl, TextField } from '@fincheck/ui';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { RefObject } from 'react';

import { IconPicker } from '#/features/categories/category-form/components/icon-picker.component.tsx';
import type { CategoryFormErrors } from '#/features/categories/category-form/types/category-form.type.ts';

type CategoryFormViewProps = {
  formRef: RefObject<HTMLDivElement | null>;
  title: string;
  subtitle: string;
  submitLabel: string;
  canPickKind: boolean;
  kind: Category.Kind;
  onKindChange: (kind: Category.Kind) => void;
  name: string;
  onNameChange: (name: string) => void;
  icon: Category.Icon;
  onIconChange: (icon: Category.Icon) => void;
  errors: CategoryFormErrors;
  submitError: string | null;
  isSaving: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

const FORM_ID = 'category-form';

/** The "Nova categoria" / "Editar categoria" modal: type (only when creating), name and icon. */
export function CategoryFormView({
  formRef,
  title,
  subtitle,
  submitLabel,
  canPickKind,
  kind,
  onKindChange,
  name,
  onNameChange,
  icon,
  onIconChange,
  errors,
  submitError,
  isSaving,
  onSubmit,
  onClose,
}: CategoryFormViewProps) {
  return (
    <Modal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      isDismissable={!isSaving}
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <Button variant="secondary" isDisabled={isSaving} onPress={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSaving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div ref={formRef} className="flex flex-col gap-s16">
          {canPickKind ? (
            <SegmentedControl
              label="Tipo da categoria"
              value={kind}
              onChange={(key) => onKindChange(key as Category.Kind)}
              options={[
                { key: 'expense', label: 'Despesa' },
                { key: 'income', label: 'Receita' },
              ]}
            />
          ) : null}
          <TextField
            label="Nome"
            value={name}
            onChange={onNameChange}
            error={errors.name}
            maxLength={40}
            autoComplete="off"
            autoFocus
          />
          <IconPicker value={icon} onChange={onIconChange} />
          {submitError ? (
            <p role="alert" className="text-meta text-alert">
              {submitError}
            </p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
