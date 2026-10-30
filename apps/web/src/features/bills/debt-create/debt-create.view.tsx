import {
  Button,
  CategoryChoices,
  ChoiceChip,
  EditDateField,
  FineNote,
  Modal,
  Money,
  MoneyField,
  SegmentedControl,
  TextField,
} from '@fincheck/ui';

import { PaymentCandidatePicker } from '#/features/bills/components/payment-candidate-picker.component.tsx';
import type {
  DebtCreateViewProps,
  DebtNote,
} from '#/features/bills/debt-create/debt-create.model.ts';

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

  const left = <Money cents={note.remainingCents} sign="none" weight="plain" />;
  const pix = <Money cents={note.pixCents} sign="none" weight="plain" />;

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
  formRef,
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
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable={!isSaving}
      size="wide"
      title="Dívida com amigo"
      subtitle="Dinheiro que você deve ou que devem a você"
      actions={
        <>
          <Button variant="secondary" isDisabled={isSaving} onPress={onClose}>
            Cancelar
          </Button>
          <Button form="debt-create-form" type="submit" loading={isSaving}>
            Salvar dívida
          </Button>
        </>
      }
    >
      <form
        id="debt-create-form"
        ref={formRef}
        noValidate
        className="flex flex-col gap-s16"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <SegmentedControl
          label="Sentido da dívida"
          options={MODES}
          value={mode}
          onChange={(key) => onModeChange(key === 'owed' ? 'owed' : 'owe')}
        />
        <div className="grid gap-s16 lg:grid-cols-2">
          <TextField
            label={mode === 'owe' ? 'Quem você deve' : 'Quem te deve'}
            value={counterparty}
            onChange={onCounterpartyChange}
            error={errors.counterparty}
            maxLength={80}
            autoComplete="off"
            autoFocus
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
        </div>
        {counterpartySuggestions.length > 0 ? (
          <div role="group" aria-label="Nomes já usados" className="flex flex-wrap gap-s8">
            {counterpartySuggestions.map((name) => (
              <ChoiceChip
                key={name}
                selected={name === counterparty}
                onChange={() => onCounterpartyChange(name)}
              >
                {name}
              </ChoiceChip>
            ))}
          </div>
        ) : null}
        <div className="grid gap-s16 lg:grid-cols-2">
          <MoneyField
            label={mode === 'owe' ? 'Valor total' : 'Valor que é do amigo'}
            cents={amountCents}
            onChange={onAmountChange}
            error={errors.amountCents}
          />
          <EditDateField
            label="Vence em (opcional)"
            value={dueOn}
            onChange={onDueOnChange}
            error={errors.dueOn}
          />
        </div>
        {categories ? (
          <CategoryChoices
            label="Categoria (opcional)"
            categories={categories.options}
            value={categories.value}
            onChange={categories.onChange}
          />
        ) : null}
        {origin ? (
          <PaymentCandidatePicker
            label="Transação que você pagou"
            optional
            options={origin.options}
            value={origin.selected}
            onChange={origin.onSelect}
            isLoading={origin.isLoading}
            noneLabel="Sem transação"
            emptyText="Nenhuma saída recente para ligar."
          />
        ) : null}
        <PaymentCandidatePicker
          label="Pix ligado a esta dívida"
          optional
          options={pix.options}
          value={pix.selected}
          onChange={pix.onSelect}
          isLoading={pix.isLoading}
          noneLabel="Sem Pix por enquanto"
          emptyText="Nenhum Pix recente encontrado. Você liga depois, quando o Pix acontecer."
        />
        <FineNote icon="calendar">
          <DebtNoteText note={note} />
        </FineNote>
        {submitError ? (
          <p role="alert" className="text-label text-loss">
            {submitError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
