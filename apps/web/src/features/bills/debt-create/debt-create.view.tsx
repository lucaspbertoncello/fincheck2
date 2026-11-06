import {
  AmountField,
  ChoiceField,
  FineNote,
  FormModal,
  FormModalMore,
  FormModalSplit,
  Money,
  TextField,
  formatCentsInput,
} from '@fincheck/ui';

import { CandidateRowsField } from '#/features/bills/components/candidate-rows-field.component.tsx';
import { CategoryChipsField } from '#/features/bills/components/category-chips-field.component.tsx';
import { DueDateField } from '#/features/bills/components/due-date-field.component.tsx';
import { PersonField } from '#/features/bills/components/person-field.component.tsx';
import type {
  DebtCreateViewProps,
  DebtNote,
} from '#/features/bills/debt-create/debt-create.model.ts';
import { NO_CATEGORY_ID } from '#/features/bills/hooks/use-category-options.hook.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

const MODES = [
  { key: 'owe', label: 'Eu devo' },
  { key: 'owed', label: 'Me devem' },
];

function DebtNoteText({ note }: { note: DebtNote }) {
  const who = note.name || 'o amigo';

  if (note.pixCents === null) {
    return note.mode === 'owe' ? (
      <>
        O Pix de volta, quando acontecer, abate a dívida e conta como gasto na data do Pix, na
        categoria escolhida.
      </>
    ) : (
      <>O Pix de {who}, quando chegar, abate o que ele te deve e não conta como receita.</>
    );
  }

  const left = <Money cents={note.remainingCents} sign="none" weight="plain" currency="inline" />;
  const pix = <Money cents={note.pixCents} sign="none" weight="plain" currency="inline" />;

  return note.mode === 'owe' ? (
    <>
      Falta {left}. O Pix de {pix} abate a dívida e conta como gasto na data do Pix.
    </>
  ) : (
    <>
      Falta receber {left}. O Pix de {pix} abate o que {who} te deve e não conta como receita.
    </>
  );
}

export function DebtCreateView({
  isOpen,
  onClose,
  mode,
  onModeChange,
  counterparty,
  onCounterpartyChange,
  counterpartySuggestions,
  description,
  onDescriptionChange,
  amountCents,
  onAmountChange,
  dueOn,
  onDueOnChange,
  categories,
  origin,
  pix,
  note,
  errors,
  submitError,
  isSaving,
  onSubmit,
}: DebtCreateViewProps) {
  const isOwe = mode === 'owe';
  const selectedOrigin = origin?.options.find((option) => option.transactionId === origin.selected);
  const moreSummary = [
    dueOn ? `vence ${formatDayMonth(dueOn)}` : null,
    pix.selected ? 'Pix ligado' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Dívida com amigo"
      description="Dinheiro que você deve ou que devem a você."
      submitLabel="Salvar dívida"
      onSubmit={onSubmit}
      isSubmitting={isSaving}
      error={submitError ?? undefined}
    >
      <FormModalSplit
        aside={
          <>
            <ChoiceField
              label="Sentido da dívida"
              variant="segmented"
              options={MODES}
              value={mode}
              onChange={(key) => onModeChange(key === 'owed' ? 'owed' : 'owe')}
            />
            <AmountField
              label={isOwe ? 'Valor total' : 'Valor que é do amigo'}
              cents={amountCents}
              onChange={onAmountChange}
              kind={isOwe ? 'expense' : 'income'}
              error={errors.amountCents}
              description={
                selectedOrigin
                  ? `Você pagou R$ ${formatCentsInput(selectedOrigin.amountCents)} no total. Já vem a metade: ajuste se não for.`
                  : undefined
              }
            />
            <FineNote icon="calendar">
              <DebtNoteText note={note} />
            </FineNote>
          </>
        }
      >
        <PersonField
          label={isOwe ? 'Quem você deve' : 'Quem te deve'}
          recent={counterpartySuggestions}
          value={counterparty}
          onChange={onCounterpartyChange}
          error={errors.counterparty}
        />
        <TextField
          label="O que foi"
          value={description}
          onChange={onDescriptionChange}
          error={errors.description}
          placeholder="Ingresso do show"
          maxLength={120}
          autoComplete="off"
        />
        {categories ? (
          <CategoryChipsField
            label="Categoria do que foi pago"
            categories={categories.options}
            noneId={NO_CATEGORY_ID}
            value={categories.value}
            onChange={categories.onChange}
          />
        ) : null}
        {origin ? (
          <CandidateRowsField
            label="Transação que você pagou"
            tone="expense"
            optional
            options={origin.options}
            value={origin.selected}
            onChange={origin.onSelect}
            isLoading={origin.isLoading}
            emptyText="Nenhuma saída recente para ligar."
          />
        ) : null}
        <FormModalMore summary={moreSummary || undefined} hasError={!!errors.dueOn}>
          <DueDateField
            label="Vence em"
            value={dueOn}
            onChange={onDueOnChange}
            error={errors.dueOn}
          />
          <CandidateRowsField
            label={isOwe ? 'Pix de volta já feito' : 'Pix já recebido'}
            tone={isOwe ? 'expense' : 'income'}
            optional
            options={pix.options}
            value={pix.selected}
            onChange={pix.onSelect}
            isLoading={pix.isLoading}
            emptyText="Nenhum Pix recente encontrado. Você liga depois, quando o Pix acontecer."
          />
        </FormModalMore>
      </FormModalSplit>
    </FormModal>
  );
}
