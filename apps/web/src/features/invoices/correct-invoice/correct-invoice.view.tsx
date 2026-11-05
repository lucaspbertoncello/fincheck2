import {
  AmountField,
  ErrorState,
  FormModal,
  FormModalGroup,
  FormModalMore,
  FormModalSplit,
  Money,
  Skeleton,
  TextField,
} from '@fincheck/ui';
import { useRef } from 'react';

import { INVALID_FIELD_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';

/** What each source says the invoice is worth. */
type InvoiceReference = {
  key: string;
  label: string;
  cents: number;
};

type CorrectInvoiceViewProps = {
  isOpen: boolean;
  onClose: () => void;
  state: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  /** The bank total, the app's calculation and the value in use, so the person sees what is being overridden. */
  references: readonly InvoiceReference[];
  /** The value the app calculates by the purchases and installments (can be a credit). */
  computedCents: number;
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

/** A value that can be a credit: a negative total reads "crédito de R$ X", never a minus (R5). */
function ReferenceValue({ cents }: { cents: number }) {
  if (cents >= 0) return <Money cents={cents} sign="none" weight="plain" />;
  return (
    <span className="flex items-baseline gap-s4">
      <span className="text-fg-secondary">crédito de</span>
      <Money cents={Math.abs(cents)} sign="none" weight="plain" tone="income" />
    </span>
  );
}

/** How far the typed value is from what the app calculated, in words and in the tone of the move. */
function DifferenceNote({ differenceCents }: { differenceCents: number }) {
  if (differenceCents === 0) {
    return <p className="text-meta text-fg-secondary">Igual ao que o app calculou.</p>;
  }
  const isMore = differenceCents > 0;
  return (
    <p aria-live="polite" className="flex items-baseline gap-s4 text-meta text-fg-secondary">
      <span className={isMore ? 'text-loss' : 'text-gain'}>
        <Money
          cents={Math.abs(differenceCents)}
          sign={isMore ? 'plus' : 'minus'}
          weight="emphasis"
        />
      </span>
      {isMore ? 'a mais' : 'a menos'} que o app calculou
    </p>
  );
}

/** Corrects the invoice total when the bank got it wrong, with a note on why (RF-INV-002). */
export function CorrectInvoiceView({
  isOpen,
  onClose,
  state,
  onRetry,
  references,
  computedCents,
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
  const content = useRef<HTMLDivElement>(null);
  useFocusFirstInvalid({
    attempt: failedAttempts,
    selector: INVALID_FIELD_SELECTOR,
    scope: content,
  });

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Corrigir valor da fatura"
      description="Vale no lugar do total do banco até você remover."
      submitLabel="Salvar correção"
      onSubmit={onSave}
      isSubmitting={isSaving}
      submitDisabled={state !== 'ready'}
      error={submitError ?? undefined}
      destructive={canRemove ? { label: 'Remover', icon: 'close', onPress: onRemove } : undefined}
    >
      <div ref={content} className="flex flex-col gap-s16 lg:gap-s24">
        {state === 'loading' ? <Skeleton className="h-ctl-touch w-full" /> : null}
        {state === 'error' ? (
          <ErrorState title="Não deu para carregar a fatura" onRetry={onRetry} headingLevel={3} />
        ) : null}
        {state === 'ready' ? (
          <FormModalSplit
            aside={
              <>
                <AmountField
                  kind="expense"
                  label="Valor correto da fatura"
                  cents={cents}
                  onChange={onCentsChange}
                  autoFocus
                />
                <DifferenceNote differenceCents={cents - computedCents} />
              </>
            }
          >
            <FormModalGroup label="O que cada um diz">
              <ul>
                {references.map((reference) => (
                  <li
                    key={reference.key}
                    className="flex items-center justify-between gap-s12 border-t border-line py-s8 text-label text-fg-primary first:border-t-0"
                  >
                    <span className="text-fg-secondary">{reference.label}</span>
                    <ReferenceValue cents={reference.cents} />
                  </li>
                ))}
              </ul>
            </FormModalGroup>
            <FormModalMore
              label="Por que corrigiu"
              summary={note.trim() ? 'Preenchido' : 'opcional'}
              hasError={Boolean(error)}
            >
              <TextField
                label="Observação (opcional)"
                value={note}
                onChange={onNoteChange}
                error={error}
                maxLength={200}
                autoComplete="off"
              />
            </FormModalMore>
          </FormModalSplit>
        ) : null}
      </div>
    </FormModal>
  );
}
