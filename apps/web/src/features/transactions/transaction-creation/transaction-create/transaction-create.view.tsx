import {
  AmountField,
  ChoiceField,
  DateQuickField,
  FormModal,
  FormModalMore,
  FormModalSplit,
  TextField,
} from '@fincheck/ui';

import { AccountChoiceField } from '#/features/transactions/transaction-fields/components/account-choice-field.component.tsx';
import { CategoryChipsField } from '#/features/transactions/transaction-fields/components/category-chips-field.component.tsx';
import type { TransactionCreateViewProps } from '#/features/transactions/transaction-creation/transaction-create/types/transaction-create-view.type.ts';

/**
 * "Nova transação" on the form-modal pattern. The amount is the hero (with Despesa | Receita above
 * it), then the description and the date; the other column takes what is chosen with a tap
 * (category, account), so the two columns weigh the same and nothing scrolls. The payment method is rare, so it waits in "Mais opções".
 */
export function TransactionCreateView(props: TransactionCreateViewProps) {
  const { values, errors } = props;
  const noAmount = values.amountCents <= 0;
  const methodLabel = props.methods.find((method) => method.id === values.method)?.label;

  return (
    <FormModal
      isOpen={props.isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      title="Nova transação"
      description="Lançada à mão. Entra nas contas do mês."
      submitLabel="Adicionar"
      submittingLabel="Salvando..."
      isSubmitting={props.saving}
      submitDisabled={props.loading || noAmount}
      submitHint={!props.loading && noAmount ? 'Informe o valor para adicionar.' : undefined}
      error={props.formError}
      onSubmit={props.onSubmit}
    >
      <FormModalSplit
        aside={
          <>
            <AmountField
              cents={values.amountCents}
              onChange={(amountCents) => props.onChange({ amountCents })}
              kind={values.type}
              onKindChange={(type) => props.onChange({ type, categoryId: null })}
              error={errors.amount}
            />
            <TextField
              label="Descrição"
              value={values.description}
              onChange={(description) => props.onChange({ description })}
              error={errors.description}
              placeholder="Ex.: Padaria, ajuste de caixa"
              autoComplete="off"
              maxLength={200}
            />
            <DateQuickField
              label="Data"
              value={values.date}
              onChange={(date) => props.onChange({ date })}
              error={errors.date}
            />
          </>
        }
      >
        <CategoryChipsField
          aside="opcional"
          categories={props.categories}
          value={values.categoryId}
          onChange={(categoryId) => props.onChange({ categoryId })}
        />
        <AccountChoiceField
          accounts={props.accounts}
          value={values.accountId}
          onChange={(accountId) => props.onChange({ accountId })}
          error={errors.account}
        />
      </FormModalSplit>
      {props.methods.length > 1 ? (
        <FormModalMore summary={methodLabel} hasError={Boolean(errors.method)}>
          <ChoiceField
            label="Meio de pagamento"
            options={props.methods.map((method) => ({ key: method.id, label: method.label }))}
            value={values.method}
            onChange={(method) => props.onChange({ method: method as typeof values.method })}
            error={errors.method}
          />
        </FormModalMore>
      ) : null}
    </FormModal>
  );
}
