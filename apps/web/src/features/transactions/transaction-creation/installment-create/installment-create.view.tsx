import {
  AmountField,
  ChoiceField,
  Collapse,
  DateQuickField,
  FineNote,
  FormModal,
  FormModalMore,
  FormModalSplit,
  SegmentedControl,
  TextField,
} from '@fincheck/ui';

import { InstallmentCountField } from '#/features/transactions/transaction-creation/installment-create/components/installment-count-field.component.tsx';
import { InstallmentPreview } from '#/features/transactions/transaction-creation/installment-create/components/installment-preview.component.tsx';
import { LockedField } from '#/features/transactions/transaction-creation/installment-create/components/locked-field.component.tsx';
import type { InstallmentCreateViewProps } from '#/features/transactions/transaction-creation/installment-create/types/installment-create-view.type.ts';
import { AccountChoiceField } from '#/features/transactions/components/account-choice-field.component.tsx';
import { CategoryChipsField } from '#/features/transactions/components/category-chips-field.component.tsx';

const AMOUNT_MODES = [
  { key: 'total', label: 'Valor total' },
  { key: 'installment', label: 'Valor da parcela' },
];

/**
 * "Compra parcelada" on the form-modal pattern, to launch a purchase and to edit a plan (the same
 * form, only the words and the locked fields change). The amount is the hero, and a switch above it
 * says whether the number is the whole purchase or one installment (a store shows either). Count and
 * card are taps (the card is text when it is already decided); the preview answers "how will this
 * land?" before saving. Date of purchase, first invoice and category wait in "Mais opções" (open in
 * an edit, where they are the point), with sensible defaults.
 */
export function InstallmentCreateView(props: InstallmentCreateViewProps) {
  const { values, errors, preview } = props;
  const isEdit = props.mode === 'edit';
  const noAmount = values.amountCents <= 0;
  const firstInvoice = props.invoiceMonths.find((month) => month.id === values.firstInvoiceMonth);

  return (
    <FormModal
      isOpen={props.isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      title={isEdit ? 'Editar compra parcelada' : 'Compra parcelada'}
      description={
        isEdit
          ? 'O cartão e a data da compra não mudam.'
          : 'Lançada à mão no cartão, uma parcela em cada fatura.'
      }
      submitLabel={isEdit ? 'Salvar' : 'Lançar compra'}
      submittingLabel={isEdit ? 'Salvando...' : 'Lançando...'}
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
              {isEdit ? null : (
                <SegmentedControl
                  label="O valor informado é"
                  options={AMOUNT_MODES}
                  value={values.amountMode}
                  onChange={(amountMode) =>
                    props.onChange({ amountMode: amountMode as typeof values.amountMode })
                  }
                />
              )}
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
        {props.lockedCard ? (
          <LockedField label="Cartão" value={props.lockedCard} />
        ) : props.cards.length > 0 ? (
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
      <Collapse
        isOpen={props.showsRecalculation}
        trackClassName="-mt-s16 lg:-mt-s24"
        contentClassName="pt-s16 lg:pt-s24"
      >
        <FineNote icon="warning">
          As parcelas serão recalculadas: a soma continua igual ao total.
        </FineNote>
      </Collapse>
      <FormModalMore
        defaultOpen={isEdit}
        summary={firstInvoice ? `fatura de ${firstInvoice.label.toLowerCase()}` : 'data, fatura'}
        hasError={Boolean(errors.date || errors.firstInvoice)}
      >
        {props.lockedPurchaseDate ? (
          <LockedField label="Data da compra" value={props.lockedPurchaseDate} />
        ) : (
          <DateQuickField
            label="Data da compra"
            value={values.purchaseOn}
            onChange={(purchaseOn) => props.onChange({ purchaseOn, firstInvoiceMonth: null })}
            error={errors.date}
          />
        )}
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
