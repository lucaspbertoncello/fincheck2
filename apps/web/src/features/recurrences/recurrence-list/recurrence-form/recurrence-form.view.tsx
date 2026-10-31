import {
  AmountField,
  Button,
  ChoiceField,
  ConfirmDialog,
  FineNote,
  FormModal,
  FormModalGroup,
  FormModalMore,
  TextField,
} from '@fincheck/ui';
import type { CategoryOption, ChoiceOption } from '@fincheck/ui';

import { CategoryChips } from '#/features/recurrences/recurrence-list/recurrence-form/components/category-chips.component.tsx';
import { DateRuleCards } from '#/features/recurrences/recurrence-list/recurrence-form/components/date-rule-cards.component.tsx';
import { DateRuleSentence } from '#/features/recurrences/recurrence-list/recurrence-form/components/date-rule-sentence.component.tsx';
import { NextDatesTrail } from '#/features/recurrences/recurrence-list/recurrence-form/components/next-dates-trail.component.tsx';
import { AccountChips } from '#/shared/components/accounts/account-chips.component.tsx';
import type { AccountChipOption } from '#/shared/components/accounts/account-chips.component.tsx';
import type { PreviewTile } from '#/features/recurrences/recurrence-list/recurrence-form/types/preview-tile.type.ts';
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
  /** Next dates of the rule, split for the trail. */
  tiles: PreviewTile[];
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

/** What the closed "Mais opções" says is inside: "extrato, 2 pagamentos, CLT". */
function summarize(values: RecurrenceFormValues): string | undefined {
  const parts = [
    values.matchText.trim() ? 'extrato' : null,
    Number(values.maxPayments) > 1 ? `${values.maxPayments} pagamentos` : null,
    values.kind === 'income' && values.employmentRegime
      ? (REGIME_LABELS[values.employmentRegime] ?? null)
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/** The modal of "Nova recorrência" and "Editar recorrência" (screens.md, Recorrências). */
export function RecurrenceFormView({
  mode,
  subtitle,
  values,
  errors,
  onChange,
  tiles,
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

  return (
    <>
      <FormModal
        isOpen
        onOpenChange={(open) => !open && onClose()}
        title={editing ? 'Editar recorrência' : 'Nova recorrência'}
        description={
          subtitle ??
          'Um valor que se repete todo mês: salário, aluguel, assinatura. O app confirma sozinho quando ele chega.'
        }
        submitLabel={editing ? 'Salvar alterações' : 'Salvar recorrência'}
        onSubmit={onSubmit}
        isSubmitting={saving}
        error={formError ?? undefined}
        initialFocus='input[name="name"]'
        destructive={editing ? { label: 'Excluir', onPress: onRequestDelete } : undefined}
      >
        <div className="grid grid-cols-1 gap-s16 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @xl:gap-x-s24">
          {/* Left column on the desktop: the amount, then when it falls. On the phone both columns dissolve and the
              order classes give: type, amount, name, who, when, category, account. */}
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
            <FormModalGroup label="Quando cai" className="order-5">
              <div className="flex flex-col gap-s8">
                <DateRuleCards
                  value={values.ruleType}
                  onChange={(ruleType) => onChange({ ruleType })}
                />
                <DateRuleSentence values={values} errors={errors} onChange={onChange} />
                <NextDatesTrail tiles={tiles} />
              </div>
            </FormModalGroup>
          </div>

          {/* Right column: who, what and where. */}
          <div className="contents @xl:flex @xl:min-w-0 @xl:flex-col @xl:gap-s16">
            <TextField
              className="order-3"
              label="Nome"
              name="name"
              value={values.name}
              onChange={(name) => onChange({ name })}
              error={errors.name}
              placeholder={income ? 'Salário Alvorada' : 'Academia'}
              maxLength={80}
              autoComplete="off"
            />
            <TextField
              className="order-4"
              label={income ? 'Vem de quem' : 'Para quem'}
              name="counterparty"
              value={values.counterparty}
              onChange={(counterparty) => onChange({ counterparty })}
              error={errors.counterparty}
              placeholder={income ? 'Alvorada Tecnologia' : 'Forma Academia'}
              maxLength={120}
              autoComplete="off"
            />
            <CategoryChips
              key={values.kind}
              className="order-6"
              label="Categoria"
              categories={categories}
              value={values.categoryId}
              onChange={(categoryId) => onChange({ categoryId })}
            />
            <AccountChips
              className="order-7"
              label={income ? 'Entra em' : 'Sai de'}
              accounts={accounts}
              value={values.accountId}
              onChange={(accountId) => onChange({ accountId })}
            />
          </div>
        </div>

        {editing ? (
          <FormModalGroup label="Esta mudança" columns={2}>
            <ChoiceField
              label="A mudança vale"
              variant="segmented"
              options={APPLY_FROM_OPTIONS}
              value={values.applyFrom}
              onChange={(key) => onChange({ applyFrom: key as RecurrenceFormValues['applyFrom'] })}
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
              >
                {paused ? 'Retomar' : 'Pausar'}
              </Button>
              <p className="text-meta text-fg-secondary">
                Pausar tira do Livre e das projeções, sem apagar o histórico.
              </p>
            </div>
          </FormModalGroup>
        ) : null}

        <FormModalMore
          summary={summarize(values)}
          hasError={Boolean(errors.matchText || errors.maxPayments)}
        >
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
                onChange({ employmentRegime: key as RecurrenceFormValues['employmentRegime'] })
              }
              description="Só para saber de onde vem esta renda."
            />
          ) : null}
        </FormModalMore>

        {historyNote ? (
          <FineNote icon="history">{historyNote}</FineNote>
        ) : (
          <FineNote icon="calendar">
            {matchHint
              ? `Confirma sozinho quando um lançamento de ${matchHint} chegar perto do valor esperado, dentro da janela da regra.`
              : 'Sem um nome do extrato, só confirma sozinho quando o valor bate exato dentro da janela da regra.'}
          </FineNote>
        )}
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
