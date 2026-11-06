import {
  AmountField,
  ChoiceField,
  Collapse,
  DateQuickField,
  FormModal,
  FormModalMore,
  FormModalSplit,
  SegmentedControl,
  TextField,
} from '@fincheck/ui';

import { InstallmentCountField } from '#/features/transactions/transaction-creation/installment-create/components/installment-count-field.component.tsx';
import { InstallmentPreview } from '#/features/transactions/transaction-creation/installment-create/components/installment-preview.component.tsx';
import type { InstallmentCreateViewProps } from '#/features/transactions/transaction-creation/installment-create/types/installment-create-view.type.ts';
import { AccountChoiceField } from '#/features/transactions/components/account-choice-field.component.tsx';
import { CategoryChipsField } from '#/features/transactions/components/category-chips-field.component.tsx';

const AMOUNT_MODES = [
  { key: 'total', label: 'Valor total' },
  { key: 'installment', label: 'Valor da parcela' },
];

/**
 * "Compra parcelada" on the form-modal pattern. The amount is the hero, and a switch above it says
 * whether the number is the whole purchase or one installment (a store shows either). Count and
 * card are taps; the preview answers "how will this land?" before saving. Date of purchase, first
 * invoice and category wait in "Mais opções", with sensible defaults.
 */
export function InstallmentCreateView(props: InstallmentCreateViewProps) {
  const { values, errors, preview } = props;
  const noAmount = values.amountCents <= 0;
  const firstInvoice = props.invoiceMonths.find((month) => month.id === values.firstInvoiceMonth);

  return (
    <FormModal
      isOpen={props.isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      title="Compra parcelada"
      description="Lançada à mão no cartão, uma parcela em cada fatura."
      submitLabel="Lançar compra"
      submittingLabel="Lançando..."
      isSubmitting={props.saving}
      submitDisabled={props.loading || noAmount}
      submitHint={!props.loading && noAmount ? 'Informe o valor da compra.' : undefined}
      error={props.formError}
      onSubmit={props.onSubmit}
    >
      <FormModalSplit
        aside={
          <>
            <div className="flex flex-col gap-s12">
              <SegmentedControl
                label="O valor informado é"
                options={AMOUNT_MODES}
                value={values.amountMode}
                onChange={(amountMode) =>
                  props.onChange({ amountMode: amountMode as typeof values.amountMode })
                }
              />
              <AmountField
                label={values.amountMode === 'total' ? 'Valor total' : 'Valor da parcela'}
                cents={values.amountCents}
                onChange={(amountCents) => props.onChange({ amountCents })}
                error={errors.total}
              />
            </div>
            <TextField
              label="Descrição"
              value={values.description}
              onChange={(description) => props.onChange({ description })}
              error={errors.description}
              placeholder="Ex.: Cadeira ergonômica"
              autoComplete="off"
              maxLength={200}
            />
          </>
        }
      >
        <InstallmentCountField
          countText={values.countText}
          onChange={(countText) => props.onChange({ countText })}
          error={errors.count}
        />
        {props.cards.length > 0 ? (
          <AccountChoiceField
            label="Cartão"
            accounts={props.cards}
            value={values.accountId}
            onChange={(accountId) => props.onChange({ accountId })}
            error={errors.account}
          />
        ) : (
          <p className="text-label text-fg-secondary">
            Você ainda não tem cartão. Crie um em Contas e cartões para lançar a compra.
          </p>
        )}
      </FormModalSplit>
      <Collapse
        isOpen={Boolean(preview)}
        trackClassName="-mt-s16 lg:-mt-s24"
        contentClassName="pt-s16 lg:pt-s24"
      >
        {preview ? <InstallmentPreview preview={preview} /> : null}
      </Collapse>
      <FormModalMore
        summary={firstInvoice ? `fatura de ${firstInvoice.label.toLowerCase()}` : 'data, fatura'}
        hasError={Boolean(errors.date || errors.firstInvoice)}
      >
        <DateQuickField
          label="Data da compra"
          value={values.purchaseOn}
          onChange={(purchaseOn) => props.onChange({ purchaseOn, firstInvoiceMonth: null })}
          error={errors.date}
        />
        <ChoiceField
          label="Primeira fatura"
          options={props.invoiceMonths.map((month) => ({ key: month.id, label: month.label }))}
          value={values.firstInvoiceMonth}
          onChange={(firstInvoiceMonth) => props.onChange({ firstInvoiceMonth })}
          error={errors.firstInvoice}
        />
        <CategoryChipsField
          aside="opcional"
          categories={props.categories}
          value={values.categoryId}
          onChange={(categoryId) => props.onChange({ categoryId })}
        />
      </FormModalMore>
    </FormModal>
  );
}
