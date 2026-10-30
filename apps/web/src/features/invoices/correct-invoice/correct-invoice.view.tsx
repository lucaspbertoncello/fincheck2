import {
  Banner,
  Button,
  EmptyState,
  FineNote,
  Modal,
  MoneyField,
  Skeleton,
  TextField,
} from '@fincheck/ui';
import { useRef } from 'react';

import { useFocusFirstInvalid } from '#/features/accounts/form-focus/hooks/use-focus-first-invalid.hook.ts';

const FORM_ID = 'correct-invoice-form';

type CorrectInvoiceViewProps = {
  isOpen: boolean;
  onClose: () => void;
  state: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  /** What the bank and the app say, so the person sees what is being overridden. */
  referenceLines: readonly string[];
  cents: number;
  onCentsChange: (cents: number) => void;
  note: string;
  onNoteChange: (note: string) => void;
  error?: string;
  failedAttempts: number;
  submitError: string | null;
  isSaving: boolean;
  /** There is a correction to remove. */
  canRemove: boolean;
  onSave: () => void;
  onRemove: () => void;
};

/** Corrects the invoice total when the bank got it wrong, with a note on why (RF-INV-002). */
export function CorrectInvoiceView({
  isOpen,
  onClose,
  state,
  onRetry,
  referenceLines,
  cents,
  onCentsChange,
  note,
  onNoteChange,
  error,
  failedAttempts,
  submitError,
  isSaving,
  canRemove,
  onSave,
  onRemove,
}: CorrectInvoiceViewProps) {
  const form = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(form, failedAttempts);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable={!isSaving}
      title="Corrigir valor da fatura"
      subtitle="Vale no lugar do total do banco até você remover."
      destructiveAction={
        canRemove ? (
          <Button variant="tertiary" danger isDisabled={isSaving} onPress={onRemove}>
            Remover correção
          </Button>
        ) : undefined
      }
      actions={
        <>
          <Button variant="secondary" isDisabled={isSaving} onPress={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSaving} isDisabled={state !== 'ready'}>
            Salvar correção
          </Button>
        </>
      }
    >
      {state === 'loading' ? <Skeleton className="h-ctl-touch w-full" /> : null}
      {state === 'error' ? (
        <EmptyState
          icon="warning"
          headingLevel={3}
          title="Não deu para carregar a fatura"
          primaryAction={{ label: 'Tentar de novo', onPress: onRetry, icon: 'sync' }}
        />
      ) : null}
      {state === 'ready' ? (
        <form
          id={FORM_ID}
          ref={form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          className="flex flex-col gap-s16"
        >
          <MoneyField
            label="Valor correto da fatura"
            cents={cents}
            onChange={onCentsChange}
            size="large"
            autoFocus
          />
          {referenceLines.map((line) => (
            <FineNote key={line} icon="calendar">
              {line}
            </FineNote>
          ))}
          <TextField
            label="Por que corrigiu (opcional)"
            value={note}
            onChange={onNoteChange}
            error={error}
            maxLength={200}
            autoComplete="off"
          />
          {submitError ? <Banner variant="error" title={submitError} /> : null}
        </form>
      ) : null}
    </Modal>
  );
}
