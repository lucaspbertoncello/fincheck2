import {
  AmountField,
  ChoiceField,
  FormModal,
  FormModalMore,
  FormModalSplit,
  TextField,
} from '@fincheck/ui';

import { CategoryChipsField } from '#/features/bills/components/category-chips-field.component.tsx';
import { DueDateField } from '#/features/bills/components/due-date-field.component.tsx';
import type { BillFormViewProps } from '#/features/bills/bill-form/bill-form.model.ts';
import { NO_CATEGORY_ID } from '#/features/bills/hooks/use-category-options.hook.ts';

const DIRECTIONS = [
  { key: 'payable', label: 'A pagar' },
  { key: 'receivable', label: 'A receber' },
];

const REPEATS = [
  { key: 'once', label: 'Só esta vez' },
  { key: 'monthly', label: 'Todo mês' },
];

export function BillFormView({
  isOpen,
  onClose,
  isEdit,
  direction,
  onDirectionChange,
  amountCents,
  onAmountChange,
  description,
  onDescriptionChange,
  counterparty,
  onCounterpartyChange,
  dueOn,
  onDueOnChange,
  categories,
  categoryId,
  onCategoryChange,
  repeat,
  errors,
  dueDateText,
  submitError,
  isSaving,
  onSubmit,
  onDelete,
}: BillFormViewProps) {
  const isPayable = direction === 'payable';
  const monthly = repeat?.value === 'monthly';
  const bucket = isPayable ? 'A pagar' : 'A receber';

  let amountHint = 'Sem vencimento: fica em "Sem data" e fora do Livre.';
  if (monthly && dueDateText) amountHint = `Repete todo mês, a partir de ${dueDateText}.`;
  else if (dueDateText) amountHint = `Entra no "${bucket}" do Livre até ${dueDateText}.`;

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isEdit ? 'Editar conta' : 'Nova conta a pagar ou receber'}
      description={
        isEdit
          ? 'Ajuste o valor, o vencimento ou a categoria.'
          : 'Uma conta avulsa, com ou sem vencimento.'
      }
      submitLabel={isEdit ? 'Salvar alterações' : 'Salvar conta'}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
      error={submitError ?? undefined}
      destructive={onDelete ? { label: 'Excluir', onPress: onDelete } : undefined}
    >
      <FormModalSplit
        aside={
          <>
            <ChoiceField
              label="Tipo da conta"
              variant="segmented"
              options={DIRECTIONS}
              value={direction}
              onChange={(key) => onDirectionChange(key === 'receivable' ? 'receivable' : 'payable')}
              isDisabled={isEdit}
            />
            <AmountField
              cents={amountCents}
              onChange={onAmountChange}
              kind={isPayable ? 'expense' : 'income'}
              error={errors.amountCents}
              description={amountHint}
            />
            <TextField
              label="Descrição"
              value={description}
              onChange={onDescriptionChange}
              error={errors.description}
              placeholder="IPTU, parcela 3"
              maxLength={120}
              autoComplete="off"
            />
            <TextField
              label={isPayable ? 'Para quem (opcional)' : 'De quem (opcional)'}
              value={counterparty}
              onChange={onCounterpartyChange}
              placeholder={isPayable ? 'Prefeitura' : 'Cliente'}
              maxLength={80}
              autoComplete="off"
            />
          </>
        }
      >
        <DueDateField
          label="Vence em"
          value={dueOn}
          onChange={onDueOnChange}
          error={errors.dueOn}
        />
        <CategoryChipsField
          label="Categoria"
          categories={categories}
          noneId={NO_CATEGORY_ID}
          value={categoryId}
          onChange={onCategoryChange}
          error={errors.categoryId}
        />
        {repeat ? (
          <FormModalMore
            summary={monthly ? 'Todo mês' : undefined}
            hasError={monthly && !!errors.dueOn}
          >
            <ChoiceField
              label="Repetição"
              variant="segmented"
              options={REPEATS}
              value={repeat.value}
              onChange={(key) => repeat.onChange(key === 'monthly' ? 'monthly' : 'once')}
              description={
                monthly
                  ? 'Vira uma recorrência no dia do vencimento: as contas dos próximos meses entram sozinhas.'
                  : 'Para repetir todo mês, escolha "Todo mês" e um vencimento.'
              }
            />
          </FormModalMore>
        ) : null}
      </FormModalSplit>
    </FormModal>
  );
}
