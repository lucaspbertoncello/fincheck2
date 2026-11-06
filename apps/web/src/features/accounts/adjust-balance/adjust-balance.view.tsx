import {
  AmountField,
  BankAvatar,
  FormModal,
  FormModalGroup,
  FormModalMore,
  Icon,
  Money,
  Skeleton,
  TextField,
  type BankThemeKey,
} from '@fincheck/ui';
import { useRef } from 'react';

import { INVALID_FIELD_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';

type AdjustBalanceViewProps = {
  isOpen: boolean;
  onClose: () => void;
  /** "Ajustar saldo" or "Atualizar saldo". */
  title: string;
  accountName: string;
  accountTheme: BankThemeKey | 'wallet';
  isLoading: boolean;
  /** The balance the account shows now (cents, may be negative). */
  currentCents: number;
  /** The balance the person wants it to show (cents, never negative). */
  cents: number;
  onCentsChange: (cents: number) => void;
  /** New balance minus the current one: what the adjustment will post. */
  differenceCents: number;
  note: string;
  onNoteChange: (note: string) => void;
  error?: string;
  failedAttempts: number;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
};

/** The adjustment in words, with its sign and tone: it is the answer to "what will this do?". */
function DifferenceLine({ differenceCents }: { differenceCents: number }) {
  if (differenceCents === 0) {
    return (
      <p
        aria-live="polite"
        className="rounded-panel border border-dashed border-line px-s16 py-s12 text-label text-fg-secondary"
      >
        Digite o novo saldo. A diferença para o atual aparece aqui.
      </p>
    );
  }

  const isGain = differenceCents > 0;
  return (
    <p
      aria-live="polite"
      className={`flex items-center gap-s12 rounded-panel px-s16 py-s12 text-label text-fg-primary ${
        isGain ? 'bg-gain-weak' : 'bg-loss-weak'
      }`}
    >
      <span className={isGain ? 'text-gain' : 'text-loss'}>
        <Icon name={isGain ? 'arrow-up-right' : 'arrow-down-right'} size="md" />
      </span>
      <span className="flex flex-col">
        <span>
          Vai lançar um ajuste de{' '}
          <Money
            cents={Math.abs(differenceCents)}
            sign={isGain ? 'plus' : 'minus'}
            tone={isGain ? 'income' : 'expense'}
            weight="emphasis"
          />
        </span>
        <span className="text-meta text-fg-secondary">Com a data de hoje, sem mexer no resto.</span>
      </span>
    </p>
  );
}

/** Sets the balance a manual account must show; the app records the difference as an adjustment. */
export function AdjustBalanceView({
  isOpen,
  onClose,
  title,
  accountName,
  accountTheme,
  isLoading,
  currentCents,
  cents,
  onCentsChange,
  differenceCents,
  note,
  onNoteChange,
  error,
  failedAttempts,
  submitError,
  isSubmitting,
  onSubmit,
}: AdjustBalanceViewProps) {
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
      size="default"
      title={title}
      description="O app lança a diferença como um ajuste de saldo."
      submitLabel="Salvar saldo"
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={isLoading || differenceCents === 0}
      submitHint={
        !isLoading && differenceCents === 0 ? 'Digite um saldo diferente do atual.' : undefined
      }
      error={submitError ?? undefined}
      initialFocus="input"
    >
      {isLoading ? (
        <Skeleton className="h-ctl-touch w-full" />
      ) : (
        <div ref={content} className="flex flex-col gap-s16 lg:gap-s24">
          <div className="flex items-center gap-s12">
            <BankAvatar theme={accountTheme} name={accountName} size={40} />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate font-title text-body font-emphasis text-fg-primary">
                {accountName}
              </p>
              <p className="text-label text-fg-secondary">Saldo atual</p>
            </div>
            <p className="text-money-md text-fg-primary">
              <Money cents={currentCents} sign="auto" />
            </p>
          </div>

          <FormModalGroup label="Quanto a conta deve mostrar">
            <AmountField
              kind="income"
              label="Novo saldo"
              cents={cents}
              onChange={onCentsChange}
              autoFocus
            />
            <DifferenceLine differenceCents={differenceCents} />
          </FormModalGroup>

          <FormModalMore
            label="Observação"
            summary={note.trim() ? 'Preenchida' : 'opcional'}
            hasError={Boolean(error)}
          >
            <TextField
              label="Por que ajustou (opcional)"
              value={note}
              onChange={onNoteChange}
              error={error}
              maxLength={200}
              autoComplete="off"
            />
          </FormModalMore>
        </div>
      )}
    </FormModal>
  );
}
