import {
  Button,
  CategoryChoices,
  ChoiceChip,
  EditDateField,
  InlineNotice,
  Modal,
  MoneyField,
  SegmentedControl,
  TextField,
} from '@fincheck/ui';

import type { TransactionCreateViewProps } from '#/features/transactions/transaction-creation/transaction-create/types/transaction-create-view.type.ts';

const FORM_ID = 'new-transaction-form';
const TYPE_OPTIONS = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
];

type ChoiceRowProps = {
  label: string;
  items: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string;
};

function ChoiceRow({ label, items, value, onChange, error }: ChoiceRowProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-s8">
      <span className="text-label text-fg-secondary">{label}</span>
      <div className="flex flex-wrap gap-s8">
        {items.map((item) => (
          <ChoiceChip key={item.id} selected={item.id === value} onChange={() => onChange(item.id)}>
            {item.label}
          </ChoiceChip>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-meta text-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Modal "Nova transação": Despesa/Receita, valor, descrição, categoria, data, conta e meio (RF-TRX-001). */
export function TransactionCreateView(props: TransactionCreateViewProps) {
  const { values, errors } = props;

  return (
    <Modal
      isOpen={props.isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      isDismissable={!props.saving}
      title="Nova transação"
      subtitle="Lançada à mão. Entra nas contas do mês."
      size="wide"
      actions={
        <>
          <Button variant="secondary" isDisabled={props.saving} onPress={props.onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={props.saving}
            loadingLabel="Salvando..."
            isDisabled={props.loading}
          >
            Salvar
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        aria-label="Nova transação"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
        className="flex flex-col gap-s16"
      >
        <SegmentedControl
          label="Tipo"
          options={TYPE_OPTIONS}
          value={values.type}
          onChange={(key) =>
            props.onChange({ type: key as 'expense' | 'income', categoryId: null })
          }
        />
        <MoneyField
          label="Valor"
          size="large"
          cents={values.amountCents}
          onChange={(amountCents) => props.onChange({ amountCents })}
          error={errors.amount}
          autoFocus
        />
        <TextField
          label="Descrição"
          value={values.description}
          onChange={(description) => props.onChange({ description })}
          error={errors.description}
          autoComplete="off"
          maxLength={200}
        />
        <EditDateField
          label="Data"
          value={values.date}
          onChange={(date) => props.onChange({ date })}
          error={errors.date}
        />
        <ChoiceRow
          label="Conta"
          items={props.accounts.map((account) => ({ id: account.id, label: account.name }))}
          value={values.accountId}
          onChange={(accountId) => props.onChange({ accountId })}
          error={errors.account}
        />
        <ChoiceRow
          label="Meio"
          items={props.methods.map((method) => ({ id: method.id, label: method.label }))}
          value={values.method}
          onChange={(method) => props.onChange({ method: method as typeof values.method })}
          error={errors.method}
        />
        <CategoryChoices
          label="Categoria (opcional)"
          categories={props.categories}
          value={values.categoryId}
          onChange={(categoryId) => props.onChange({ categoryId })}
        />
        {props.formError ? <InlineNotice>{props.formError}</InlineNotice> : null}
      </form>
    </Modal>
  );
}
