import {
  Button,
  ChoiceField,
  FormModal,
  FormModalGroup,
  FormModalSplit,
  TextField,
} from '@fincheck/ui';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { RefObject } from 'react';

import { CategoryPreview } from '#/features/categories/category-form/components/category-preview.component.tsx';
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
  usage: string | null;
  errors: CategoryFormErrors;
  submitError: string | null;
  isSaving: boolean;
  /** Edit of an active category: "Arquivar" at the left of the footer. */
  onArchive: (() => void) | null;
  /** Edit of an archived category: the note and "Desarquivar" in the body. */
  restore: { note: string; onRestore: () => void } | null;
  onSubmit: () => void;
  onClose: () => void;
};

const KIND_OPTIONS = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
] as const;

/**
 * The "Nova categoria" / "Editar categoria" modal in the form pattern: left the type, the name and
 * the live preview of the category in a transaction row; right the icon grid. Archiving sits at the
 * left of the footer with its impact in the confirmation; an archived category offers "Desarquivar".
 */
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
  usage,
  errors,
  submitError,
  isSaving,
  onArchive,
  restore,
  onSubmit,
  onClose,
}: CategoryFormViewProps) {
  return (
    <FormModal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={subtitle}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
      error={submitError ?? undefined}
      destructive={
        onArchive ? { label: 'Arquivar', icon: 'archive', onPress: onArchive } : undefined
      }
      initialFocus='input[type="text"]'
    >
      <div ref={formRef}>
        <FormModalSplit
          aside={
            <>
              <FormModalGroup label="Categoria">
                {canPickKind ? (
                  <ChoiceField
                    label="Tipo"
                    variant="segmented"
                    value={kind}
                    onChange={(key) => onKindChange(key as Category.Kind)}
                    options={KIND_OPTIONS}
                  />
                ) : null}
                <TextField
                  label="Nome"
                  value={name}
                  onChange={onNameChange}
                  error={errors.name}
                  maxLength={40}
                  autoComplete="off"
                />
              </FormModalGroup>
              <FormModalGroup label="Como aparece">
                <CategoryPreview name={name} icon={icon} kind={kind} />
                {usage ? <p className="text-meta text-fg-secondary">{usage}</p> : null}
                {restore ? (
                  <div className="flex flex-col items-start gap-s8 rounded-input border border-line p-s12">
                    <p className="text-label text-fg-secondary">{restore.note}</p>
                    <Button variant="secondary" size="sm" onPress={restore.onRestore}>
                      Desarquivar
                    </Button>
                  </div>
                ) : null}
              </FormModalGroup>
            </>
          }
        >
          <FormModalGroup label="Ícone">
            <IconPicker value={icon} onChange={onIconChange} />
          </FormModalGroup>
        </FormModalSplit>
      </div>
    </FormModal>
  );
}
