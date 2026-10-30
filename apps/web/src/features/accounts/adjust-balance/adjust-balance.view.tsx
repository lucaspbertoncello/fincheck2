import { Banner, Button, FineNote, Modal, MoneyField, Skeleton, TextField } from '@fincheck/ui';
import { useRef } from 'react';

import { useFocusFirstInvalid } from '#/features/accounts/form-focus/hooks/use-focus-first-invalid.hook.ts';

const FORM_ID = 'adjust-balance-form';

type AdjustBalanceViewProps = {
  isOpen: boolean;
  onClose: () => void;
  /** "Ajustar saldo" or "Atualizar saldo". */
  title: string;
  accountName: string;
  isLoading: boolean;
  cents: number;
  onCentsChange: (cents: number) => void;
  note: string;
  onNoteChange: (note: string) => void;
  error?: string;
  failedAttempts: number;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
};

/** Sets the balance a manual account must show; the app records the difference as an adjustment. */
export function AdjustBalanceView({
  isOpen,
  onClose,
  title,
  accountName,
  isLoading,
  cents,
  onCentsChange,
  note,
  onNoteChange,
  error,
  failedAttempts,
  submitError,
  isSubmitting,
  onSubmit,
}: AdjustBalanceViewProps) {
  const form = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(form, failedAttempts);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable={!isSubmitting}
      title={title}
      subtitle={accountName}
      actions={
        <>
          <Button variant="secondary" isDisabled={isSubmitting} onPress={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSubmitting} isDisabled={isLoading}>
            Salvar saldo
          </Button>
        </>
      }
    >
      {isLoading ? (
        <Skeleton className="h-ctl-touch w-full" />
      ) : (
        <form
          id={FORM_ID}
          ref={form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-s16"
        >
          <MoneyField
            label="Saldo que a conta deve mostrar"
            cents={cents}
            onChange={onCentsChange}
            size="large"
            autoFocus
          />
          <TextField
            label="Observação (opcional)"
            value={note}
            onChange={onNoteChange}
            error={error}
            maxLength={200}
            autoComplete="off"
          />
          <FineNote icon="edit">
            A diferença vira uma transação de ajuste de saldo, com a data de hoje.
          </FineNote>
          {submitError ? <Banner variant="error" title={submitError} /> : null}
        </form>
      )}
    </Modal>
  );
}
