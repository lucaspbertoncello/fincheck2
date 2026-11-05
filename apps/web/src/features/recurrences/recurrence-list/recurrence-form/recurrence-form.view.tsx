import {
  AmountField,
  Button,
  ChoiceField,
  ConfirmDialog,
  FineNote,
  FormModal,
  FormModalMore,
  TextField,
} from '@fincheck/ui';
import type { CategoryOption, ChoiceOption } from '@fincheck/ui';
import { useId } from 'react';

import type { AccountChipOption } from '#/shared/types/account/account-chip-option.type.ts';
import { CategoryChips } from '#/features/recurrences/recurrence-list/recurrence-form/components/category-chips.component.tsx';
import { DateRuleEditor } from '#/features/recurrences/recurrence-list/recurrence-form/components/date-rule-editor.component.tsx';
import { AccountChips } from '#/shared/components/accounts/account-chips.component.tsx';
import type {
  PreviewDate,
  PreviewStatus,
} from '#/features/recurrences/recurrence-list/recurrence-form/types/preview-date.type.ts';
import type {
  RecurrenceFormErrors,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

type RecurrenceFormViewProps = {
  mode: 'create' | 'edit';
  /** Edit only: "Plano celular, ativa desde 07/2026". */
  subtitle?: string;
  values: RecurrenceFormValues;
  errors: RecurrenceFormErrors;
  onChange: (patch: Partial<RecurrenceFormValues>) => void;
  /** Next dates of the rule, ready for the preview, and what the preview box says. */
  previewDates: PreviewDate[];
  previewStatus: PreviewStatus;
  /** Categories of the chosen type, the most used first. */
  categories: CategoryOption[];
  /** Accounts as choices (no cards). */
  accounts: AccountChipOption[];
  /** Edit only: the confirmations so far. */
  historyNote?: string;
  paused: boolean;
  formError: string | null;
  saving: boolean;
  pausing: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onPause: () => void;
  confirmingDelete: boolean;
  deleting: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

const APPLY_FROM_OPTIONS: ChoiceOption[] = [
  { key: 'next_month', label: 'Daqui para a frente' },
  { key: 'current_month', label: 'Também neste mês' },
];

const REGIME_OPTIONS: ChoiceOption[] = [
  { key: 'clt', label: 'CLT' },
  { key: 'pj', label: 'PJ' },
  { key: 'other', label: 'Outro' },
];

const REGIME_LABELS: Record<string, string> = { clt: 'CLT', pj: 'PJ', other: 'Outro' };

const digitsOnly = (text: string) => text.replace(/\D/g, '');

/** What the closed "Mais opções" says is inside: "extrato, 2 pagamentos", or a count when there are more. */
function summarize(
  values: RecurrenceFormValues,
  paused: boolean,
  editing: boolean,
): string | undefined {
  const parts = [
    paused ? 'pausada' : null,
    editing && values.applyFrom === 'current_month' ? 'vale neste mês' : null,
    values.counterparty.trim() ? (values.kind === 'income' ? 'origem' : 'destino') : null,
    values.matchText.trim() ? 'extrato' : null,
    Number(values.maxPayments) > 1 ? `${values.maxPayments} pagamentos` : null,
    values.kind === 'income' && values.employmentRegime
      ? (REGIME_LABELS[values.employmentRegime] ?? null)
      : null,
  ].filter(Boolean);

  if (parts.length === 0) return undefined;
  return parts.length > 2 ? `${parts.length} preenchidas` : parts.join(', ');
}

/** The modal of "Nova recorrência" and "Editar recorrência" (screens.md, Recorrências). */
export function RecurrenceFormView({
  mode,
  subtitle,
  values,
  errors,
  onChange,
  previewDates,
  previewStatus,
  categories,
  accounts,
  historyNote,
  paused,
  formError,
  saving,
  pausing,
  onSubmit,
  onClose,
  onPause,
  confirmingDelete,
  deleting,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: RecurrenceFormViewProps) {
  const editing = mode === 'edit';
  const income = values.kind === 'income';
  const matchHint = values.matchText.trim() || values.counterparty.trim();
  const pauseHintId = useId();

  return (
    <>
      <FormModal
        isOpen
        onOpenChange={(open) => !open && onClose()}
        title={editing ? 'Editar recorrência' : 'Nova recorrência'}
        description={
          subtitle ?? 'Um valor que se repete todo mês. O app confirma sozinho quando ele chega.'
        }
        submitLabel={editing ? 'Salvar alterações' : 'Salvar recorrência'}
        onSubmit={onSubmit}
        isSubmitting={saving}
        error={formError ?? undefined}
        initialFocus='input[name="name"]'
        destructive={editing ? { label: 'Excluir', onPress: onRequestDelete } : undefined}
      >
        <div className="flex flex-col gap-s12 @xl:gap-s16">
          {/* Desktop: two columns and a band. Left the amount and the name; right the category and the account;
              under both, "Quando cai" across the width; "Mais opções" last, outside the grid, so opening it
              moves nothing that was there. On the phone the columns dissolve and the order classes give:
              type, amount, name, when, category, account, then more. */}
          <div className="grid grid-cols-1 gap-s16 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] @xl:gap-x-s24 @xl:gap-y-s12">
            <div className="contents @xl:flex @xl:min-w-0 @xl:flex-col @xl:gap-s16 @xl:border-r @xl:border-line @xl:pr-s24">
              <AmountField
                className="order-1"
                label="Valor esperado"
                name="amountCents"
                cents={values.amountCents}
                onChange={(amountCents) => onChange({ amountCents })}
                kind={values.kind}
                onKindChange={
                  editing
                    ? undefined
                    : (kind) =>
                        onChange({
                          kind,
                          categoryId: null,
                          employmentRegime: kind === 'income' ? values.employmentRegime : '',
                        })
                }
                error={errors.amountCents}
              />
              <TextField
                className="order-2"
                label="Nome"
                name="name"
                value={values.name}
                onChange={(name) => onChange({ name })}
                error={errors.name}
                placeholder={income ? 'Salário Alvorada' : 'Academia'}
                maxLength={80}
                autoComplete="off"
              />
            </div>

            <div className="contents @xl:flex @xl:min-w-0 @xl:flex-col @xl:gap-s16">
              <CategoryChips
                key={values.kind}
                className="order-4"
                label="Categoria"
                categories={categories}
                value={values.categoryId}
                onChange={(categoryId) => onChange({ categoryId })}
              />
              <AccountChips
                className="order-5"
                label={income ? 'Entra em' : 'Sai de'}
                accounts={accounts}
                value={values.accountId}
                onChange={(accountId) => onChange({ accountId })}
              />
            </div>

            <div className="order-3 @xl:col-span-2">
              <DateRuleEditor
                values={values}
                errors={errors}
                onChange={onChange}
                previewStatus={previewStatus}
                previewDates={previewDates}
              />
            </div>
          </div>

          <FormModalMore
            summary={summarize(values, paused, editing)}
            hasError={Boolean(errors.matchText || errors.maxPayments || errors.counterparty)}
          >
            {editing ? (
              <>
                <ChoiceField
                  label="A mudança vale"
                  variant="segmented"
                  options={APPLY_FROM_OPTIONS}
                  value={values.applyFrom}
                  onChange={(key) =>
                    onChange({ applyFrom: key as RecurrenceFormValues['applyFrom'] })
                  }
                />
                <div className="flex flex-col gap-s4">
                  <span className="text-label text-fg-secondary">
                    {paused ? 'Esta recorrência está pausada' : 'Precisa de um tempo?'}
                  </span>
                  <Button
                    variant="secondary"
                    icon={paused ? 'sync' : 'clock'}
                    loading={pausing}
                    onPress={onPause}
                    aria-describedby={pauseHintId}
                  >
                    {paused ? 'Retomar' : 'Pausar'}
                  </Button>
                  <p id={pauseHintId} className="sr-only">
                    Pausar tira do Livre e das projeções, sem apagar o histórico.
                  </p>
                </div>
              </>
            ) : null}
            <>
              <TextField
                label={income ? 'Vem de quem' : 'Para quem'}
                name="counterparty"
                value={values.counterparty}
                onChange={(counterparty) => onChange({ counterparty })}
                error={errors.counterparty}
                placeholder={income ? 'Alvorada Tecnologia' : 'Forma Academia'}
                maxLength={120}
                autoComplete="off"
              />
              <TextField
                label="Aparece no extrato como"
                name="matchText"
                value={values.matchText}
                onChange={(matchText) => onChange({ matchText })}
                error={errors.matchText}
                description="O nome que o banco escreve, como G PRADO. Ajuda a confirmar sozinho."
                maxLength={80}
                autoComplete="off"
              />
              <TextField
                label="Pagamentos por mês"
                name="maxPayments"
                value={values.maxPayments}
                onChange={(text) => onChange({ maxPayments: digitsOnly(text) })}
                error={errors.maxPayments}
                inputMode="numeric"
                description="Mais de 1 para valor dividido em Pix. De 1 a 5."
                autoComplete="off"
              />
              {income ? (
                <ChoiceField
                  label="Regime"
                  variant="segmented"
                  options={REGIME_OPTIONS}
                  value={values.employmentRegime === '' ? null : values.employmentRegime}
                  onChange={(key) =>
                    onChange({
                      employmentRegime: key as RecurrenceFormValues['employmentRegime'],
                    })
                  }
                  description="Só para saber de onde vem esta renda."
                />
              ) : null}
            </>
            {historyNote ? (
              <FineNote icon="history">{historyNote}</FineNote>
            ) : (
              <FineNote icon="calendar">
                {matchHint
                  ? `Confirma sozinho quando um lançamento de ${matchHint} chegar perto do valor esperado, dentro da janela da regra.`
                  : 'Sem um nome do extrato, só confirma sozinho quando o valor bate exato dentro da janela da regra.'}
              </FineNote>
            )}
          </FormModalMore>
        </div>
      </FormModal>
      <ConfirmDialog
        isOpen={confirmingDelete}
        onOpenChange={(open) => !open && onCancelDelete()}
        destructive
        icon="trash"
        title="Excluir esta recorrência?"
        description="Ela sai do Livre e das projeções, e as ocorrências futuras são apagadas. O que já foi confirmado fica no histórico."
        confirmLabel="Excluir"
        onConfirm={onConfirmDelete}
        loading={deleting}
      />
    </>
  );
}
