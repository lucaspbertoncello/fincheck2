import { Button, Modal, TextField } from '@fincheck/ui';
import type { RefObject } from 'react';

type TagFormViewProps = {
  formRef: RefObject<HTMLDivElement | null>;
  title: string;
  subtitle: string;
  submitLabel: string;
  name: string;
  onNameChange: (name: string) => void;
  error: string | undefined;
  submitError: string | null;
  isSaving: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

const FORM_ID = 'tag-form';

/** The "Nova tag" / "Renomear tag" modal: just the name. */
export function TagFormView({
  formRef,
  title,
  subtitle,
  submitLabel,
  name,
  onNameChange,
  error,
  submitError,
  isSaving,
  onSubmit,
  onClose,
}: TagFormViewProps) {
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
          <TextField
            label="Nome da tag"
            value={name}
            onChange={onNameChange}
            error={error}
            maxLength={30}
            autoComplete="off"
            autoFocus
          />
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
