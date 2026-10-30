import { FormModal, FormModalGroup, Icon, TextField } from '@fincheck/ui';
import type { RefObject } from 'react';

type TagFormViewProps = {
  formRef: RefObject<HTMLDivElement | null>;
  title: string;
  subtitle: string;
  submitLabel: string;
  name: string;
  onNameChange: (name: string) => void;
  error: string | undefined;
  /** Rename only: how many transactions carry the tag. */
  usage: string | null;
  submitError: string | null;
  isSaving: boolean;
  /** Rename of an active tag: "Arquivar" at the left of the footer. */
  onArchive: (() => void) | null;
  onSubmit: () => void;
  onClose: () => void;
};

/** The "Nova tag" / "Renomear tag" modal in the form pattern: the name, with the tag as it reads. */
export function TagFormView({
  formRef,
  title,
  subtitle,
  submitLabel,
  name,
  onNameChange,
  error,
  usage,
  submitError,
  isSaving,
  onArchive,
  onSubmit,
  onClose,
}: TagFormViewProps) {
  const trimmed = name.trim();

  return (
    <FormModal
      isOpen
      size="default"
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
    >
      <div ref={formRef}>
        <FormModalGroup label="Tag">
          <TextField
            label="Nome da tag"
            value={name}
            onChange={onNameChange}
            error={error}
            maxLength={30}
            autoComplete="off"
          />
          <div className="flex items-center gap-s12 rounded-input bg-subtle p-s12">
            <span className="grid size-8 shrink-0 place-items-center rounded-capsule bg-brand-weak text-brand">
              <Icon name="hash" size="sm" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span
                className={
                  trimmed
                    ? 'truncate text-body font-emphasis text-fg-primary'
                    : 'truncate text-body text-fg-tertiary'
                }
              >
                {trimmed || 'nome-da-tag'}
              </span>
              {usage ? <span className="text-meta text-fg-secondary">{usage}</span> : null}
            </div>
          </div>
        </FormModalGroup>
      </div>
    </FormModal>
  );
}
