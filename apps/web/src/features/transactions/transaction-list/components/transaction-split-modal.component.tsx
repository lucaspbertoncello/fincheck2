import {
  Button,
  CategoryPicker,
  FormModal,
  FormModalGroup,
  MoneyField,
  Money,
  SplitSumIndicator,
} from '@fincheck/ui';

import type { TransactionSplitterView } from '#/shared/types/transactions/transaction-list-view.type.ts';

type TransactionSplitModalProps = {
  splitter: TransactionSplitterView;
};

/**
 * "Dividir em duas": one transaction, two categories, to the cent (RF-TRX-005). The total is the
 * hero; each part is a group with its category and amount, side by side on the desktop. Typing one
 * part gives the rest to the other, so the sum only breaks on purpose, and the indicator says how
 * much is missing. "Dividir" waits until the parts close the total. A split one can be undone from
 * the footer.
 */
export function TransactionSplitModal({ splitter }: TransactionSplitModalProps) {
  const { parts, totalCents, check } = splitter;

  return (
    <FormModal
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) splitter.onCancel();
      }}
      title="Dividir transação"
      description={splitter.description}
      submitLabel="Dividir"
      submittingLabel="Dividindo..."
      isSubmitting={splitter.saving}
      submitDisabled={!check.valid}
      submitHint={check.valid ? undefined : 'As partes precisam fechar o total.'}
      error={splitter.error}
      destructive={
        splitter.isSplit
          ? { label: 'Desfazer', icon: 'split', onPress: splitter.onUnsplit }
          : undefined
      }
      onSubmit={() => {
        if (check.valid) splitter.onConfirm();
      }}
      size="form"
    >
      <p className="flex items-baseline justify-between gap-s12 rounded-panel bg-subtle px-s16 py-s12">
        <span className="text-label text-fg-secondary">Total a dividir</span>
        <Money cents={totalCents} sign="none" className="text-money-md text-fg-primary" />
      </p>
      <FormModalGroup columns={2}>
        {parts.map((part, index) => (
          <div
            key={part.id}
            role="group"
            aria-label={`Parte ${index + 1}`}
            className="flex min-w-0 flex-col gap-s12 rounded-panel border border-line p-s16"
          >
            <h3 className="text-label font-emphasis text-fg-primary">Parte {index + 1}</h3>
            <CategoryPicker
              label={`Categoria da parte ${index + 1}`}
              categories={splitter.categories}
              value={part.categoryId}
              onChange={(categoryId) => splitter.onCategoryChange(index, categoryId)}
              autoFocus={index === 0}
            />
            <MoneyField
              label={`Valor da parte ${index + 1}`}
              cents={part.amountCents}
              onChange={(amountCents) => splitter.onAmountChange(index, amountCents)}
              error={check.emptyPartIndexes.includes(index) ? 'Informe o valor.' : undefined}
            />
          </div>
        ))}
      </FormModalGroup>
      <div className="flex flex-wrap items-center justify-between gap-s12">
        <SplitSumIndicator status={check.status} differenceCents={check.differenceCents} />
        <Button variant="tertiary" size="sm" onPress={splitter.onEvenSplit}>
          Dividir por igual
        </Button>
      </div>
    </FormModal>
  );
}
