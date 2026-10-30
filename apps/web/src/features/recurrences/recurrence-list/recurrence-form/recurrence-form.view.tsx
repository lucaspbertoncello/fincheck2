import {
  Banner,
  Button,
  ConfirmDialog,
  DateRulePicker,
  FineNote,
  Modal,
  MoneyField,
  SegmentedControl,
  TextField,
} from '@fincheck/ui';

import type {
  RecurrenceFormErrors,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';
import { buildDateRuleOptions } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-date-rule-options.util.ts';

type RecurrenceFormViewProps = {
  formId: string;
  mode: 'create' | 'edit';
  subtitle?: string;
  values: RecurrenceFormValues;
  errors: RecurrenceFormErrors;
  onChange: (patch: Partial<RecurrenceFormValues>) => void;
  /** Next dates of the rule, already written. */
  preview: string[];
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

const KIND_OPTIONS = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
];

const APPLY_FROM_OPTIONS = [
  { key: 'next_month', label: 'Daqui para a frente' },
  { key: 'current_month', label: 'Também neste mês' },
];

const digitsOnly = (text: string) => text.replace(/\D/g, '');

/** The modal of "Nova recorrência" and "Editar recorrência" (screens.md, Recorrências). */
export function RecurrenceFormView({
  formId,
  mode,
  subtitle,
  values,
  errors,
  onChange,
  preview,
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
  const { ruleType } = values;
  const matchHint = values.matchText.trim() || values.counterparty.trim();

  return (
    <>
      <Modal
        isOpen
        onOpenChange={(open) => !open && onClose()}
        isDismissable={!saving}
        size="wide"
        title={editing ? 'Editar recorrência' : 'Nova recorrência'}
        subtitle={subtitle}
        destructiveAction={
          editing ? (
            <>
              <Button
                variant="tertiary"
                icon={paused ? 'sync' : 'clock'}
                loading={pausing}
                onPress={onPause}
              >
                {paused ? 'Retomar' : 'Pausar'}
              </Button>
              <Button variant="tertiary" danger icon="trash" onPress={onRequestDelete}>
                Excluir
              </Button>
            </>
          ) : undefined
        }
        actions={
          <>
            <Button variant="tertiary" onPress={onClose} isDisabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} loading={saving}>
              {editing ? 'Salvar alterações' : 'Salvar recorrência'}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-s16"
        >
          <SegmentedControl
            label="Tipo"
            options={KIND_OPTIONS}
            value={values.kind}
            onChange={(key) => onChange({ kind: key as RecurrenceFormValues['kind'] })}
            isDisabled={editing}
          />
          <div className="grid gap-s16 lg:grid-cols-2">
            <TextField
              label="Nome"
              name="name"
              value={values.name}
              onChange={(name) => onChange({ name })}
              error={errors.name}
              maxLength={80}
              autoComplete="off"
            />
            <MoneyField
              label="Valor esperado"
              name="amountCents"
              cents={values.amountCents}
              onChange={(amountCents) => onChange({ amountCents })}
              error={errors.amountCents}
            />
          </div>
          <TextField
            label="Vem de quem"
            name="counterparty"
            value={values.counterparty}
            onChange={(counterparty) => onChange({ counterparty })}
            error={errors.counterparty}
            placeholder="Pix de G. Prado, conta PJ"
            maxLength={120}
            autoComplete="off"
          />
          <TextField
            label="Aparece no extrato como"
            name="matchText"
            value={values.matchText}
            onChange={(matchText) => onChange({ matchText })}
            error={errors.matchText}
            description="Opcional. O nome que o banco escreve, como G PRADO. Ajuda a confirmar sozinho."
            maxLength={80}
            autoComplete="off"
          />

          <fieldset className="flex min-w-0 flex-col gap-s8 border-0 p-0">
            <legend className="mb-s8 text-label text-fg-secondary">Quando cai</legend>
            <DateRulePicker
              label="Regra de data"
              options={buildDateRuleOptions(values)}
              value={ruleType}
              onChange={(key) => onChange({ ruleType: key as RecurrenceFormValues['ruleType'] })}
              preview={preview}
              previewLabel="Próximas datas"
            />
          </fieldset>

          <div className="grid gap-s16 lg:grid-cols-3">
            {ruleType === 'business_day' ? (
              <TextField
                label="Qual dia útil"
                name="businessDayNumber"
                value={values.businessDayNumber}
                onChange={(text) => onChange({ businessDayNumber: digitsOnly(text) })}
                error={errors.businessDayNumber}
                inputMode="numeric"
                description="De 1 a 23"
                autoComplete="off"
              />
            ) : (
              <TextField
                label={ruleType === 'any_day' ? 'Dia provável (opcional)' : 'Dia do mês'}
                name="day"
                value={values.day}
                onChange={(text) => onChange({ day: digitsOnly(text) })}
                error={errors.day}
                inputMode="numeric"
                description="De 1 a 31"
                autoComplete="off"
              />
            )}
            {ruleType === 'around_day' ? (
              <TextField
                label="Dias para mais ou menos"
                name="toleranceDays"
                value={values.toleranceDays}
                onChange={(text) => onChange({ toleranceDays: digitsOnly(text) })}
                error={errors.toleranceDays}
                inputMode="numeric"
                description="De 0 a 15"
                autoComplete="off"
              />
            ) : null}
            <TextField
              label="Pagamentos por mês"
              name="maxPayments"
              value={values.maxPayments}
              onChange={(text) => onChange({ maxPayments: digitsOnly(text) })}
              error={errors.maxPayments}
              inputMode="numeric"
              description="Mais de 1 para valor dividido em Pix"
              autoComplete="off"
            />
          </div>

          {editing ? (
            <div className="flex flex-col gap-s8">
              <p className="text-label text-fg-secondary">A mudança vale</p>
              <SegmentedControl
                label="A mudança vale"
                options={APPLY_FROM_OPTIONS}
                value={values.applyFrom}
                onChange={(key) =>
                  onChange({ applyFrom: key as RecurrenceFormValues['applyFrom'] })
                }
              />
            </div>
          ) : null}

          {historyNote ? (
            <FineNote icon="history">{historyNote}</FineNote>
          ) : (
            <FineNote icon="calendar">
              {matchHint
                ? `Confirma sozinho quando um lançamento de ${matchHint} chegar perto do valor esperado, dentro da janela da regra.`
                : 'Sem um nome do extrato, só confirma sozinho quando o valor bate exato dentro da janela da regra.'}
            </FineNote>
          )}
          {editing ? (
            <FineNote icon="warning">
              Pausar tira esta recorrência do Livre e das projeções, sem apagar o histórico. Excluir
              apaga as ocorrências futuras; o que já foi confirmado fica.
            </FineNote>
          ) : null}
          {formError ? (
            <Banner variant="error" title="Não foi possível salvar" description={formError} />
          ) : null}
        </form>
      </Modal>
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
