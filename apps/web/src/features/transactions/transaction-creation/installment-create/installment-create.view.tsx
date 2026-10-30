import {
  Button,
  CategoryChoices,
  ChoiceChip,
  EditDateField,
  InlineNotice,
  Modal,
  Money,
  MoneyField,
  TextField,
} from '@fincheck/ui';

import type { InstallmentCreateViewProps } from '#/features/transactions/transaction-creation/installment-create/types/installment-create-view.type.ts';

const FORM_ID = 'new-installment-form';

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

/** Modal "Compra parcelada": total, description, category, installments, card, first invoice and the preview (RF-INV-004). */
export function InstallmentCreateView(props: InstallmentCreateViewProps) {
  const { values, errors, preview } = props;

  return (
    <Modal
      isOpen={props.isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      isDismissable={!props.saving}
      title="Compra parcelada"
      subtitle="Lançada à mão no cartão, uma parcela em cada fatura."
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
            Lançar compra
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        aria-label="Compra parcelada"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
        className="flex flex-col gap-s16"
      >
        <MoneyField
          label="Valor total"
          size="large"
          cents={values.totalCents}
          onChange={(totalCents) => props.onChange({ totalCents })}
          error={errors.total}
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
        <div className="grid grid-cols-2 gap-s16">
          <TextField
            label="Parcelas"
            value={values.countText}
            onChange={(countText) => props.onChange({ countText })}
            error={errors.count}
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
          />
          <EditDateField
            label="Data da compra"
            value={values.purchaseOn}
            onChange={(purchaseOn) => props.onChange({ purchaseOn, firstInvoiceMonth: null })}
            error={errors.date}
          />
        </div>
        <ChoiceRow
          label="Cartão"
          items={props.cards.map((card) => ({ id: card.id, label: card.name }))}
          value={values.accountId}
          onChange={(accountId) => props.onChange({ accountId })}
          error={errors.account}
        />
        <ChoiceRow
          label="Primeira fatura"
          items={props.invoiceMonths}
          value={values.firstInvoiceMonth}
          onChange={(firstInvoiceMonth) => props.onChange({ firstInvoiceMonth })}
          error={errors.firstInvoice}
        />
        <CategoryChoices
          label="Categoria (opcional)"
          categories={props.categories}
          value={values.categoryId}
          onChange={(categoryId) => props.onChange({ categoryId })}
        />
        {preview.rows.length > 0 ? (
          <section
            aria-label="Prévia das parcelas"
            className="flex flex-col gap-s8 rounded-panel bg-subtle p-s16"
          >
            <h3 className="text-label font-emphasis text-fg-primary">Prévia das parcelas</h3>
            <ul className="m-0 flex flex-col gap-s4 p-0">
              {preview.rows.map((row) => (
                <li
                  key={row.number}
                  className="flex list-none items-baseline justify-between gap-s12 text-label text-fg-secondary"
                >
                  <span>
                    {row.number}/{preview.count} · fatura de {row.monthLabel}
                  </span>
                  <Money cents={row.cents} sign="none" weight="plain" className="text-fg-primary" />
                </li>
              ))}
            </ul>
            {preview.hiddenCount > 0 ? (
              <p className="text-meta text-fg-secondary">
                e mais {preview.hiddenCount} {preview.hiddenCount === 1 ? 'parcela' : 'parcelas'}
              </p>
            ) : null}
          </section>
        ) : null}
        {props.formError ? <InlineNotice>{props.formError}</InlineNotice> : null}
      </form>
    </Modal>
  );
}
