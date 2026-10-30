import { createTransactionRequestSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { buildCategoryOptions } from '#/features/transactions/transaction-list/utils/build-category-options.util.ts';
import { describeTransactionError } from '#/features/transactions/transaction-list/utils/describe-transaction-error.util.ts';
import { focusFirstInvalid } from '#/features/transactions/transaction-list/utils/focus-first-invalid.util.ts';
import { toBusinessDate } from '#/features/transactions/transaction-list/utils/to-business-date.util.ts';
import { buildAccountChoices } from '#/features/transactions/transaction-fields/utils/build-account-choices.util.ts';
import { rankCategoriesByUse } from '#/features/transactions/transaction-fields/utils/rank-categories-by-use.util.ts';
import {
  CARD_METHODS,
  OTHER_METHODS,
  TRANSACTION_CREATE_FIELDS,
  TRANSACTION_CREATE_MESSAGES,
} from '#/features/transactions/transaction-creation/transaction-create/constants/transaction-create-messages.constant.ts';
import { TRANSACTION_METHOD_CHOICES } from '#/features/transactions/transaction-creation/transaction-create/constants/transaction-method-choices.constant.ts';
import { useTransactionCreateModel } from '#/features/transactions/transaction-creation/transaction-create/transaction-create.model.ts';
import { TransactionCreateView } from '#/features/transactions/transaction-creation/transaction-create/transaction-create.view.tsx';
import type {
  TransactionCreateErrors,
  TransactionCreateValues,
} from '#/features/transactions/transaction-creation/transaction-create/types/transaction-create-form.type.ts';
import { collectFieldErrors } from '#/features/transactions/transaction-creation/utils/collect-field-errors.util.ts';

type Props = {
  /** Called after the modal closed, to clear its draft (the modal is remounted per opening). */
  onClose: () => void;
};

function initialValues(): TransactionCreateValues {
  return {
    type: 'expense',
    amountCents: 0,
    description: '',
    date: toBusinessDate(new Date()),
    categoryId: null,
    accountId: null,
    method: null,
  };
}

/**
 * "Nova transação" (RF-TRX-001). Open it with the `?new=transaction` search param, from any screen.
 * Validates with the request schema, puts the error under the field and the focus on the first
 * invalid one, and ends with a "Desfazer" toast that deletes the new transaction.
 */
export function TransactionCreateViewModel({ onClose }: Props) {
  const model = useTransactionCreateModel();
  const { showUndoToast } = useToast();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<TransactionCreateErrors>({});
  const [formError, setFormError] = useState<string>();

  const accounts = (model.accounts.data?.items ?? []).filter(
    (account) => account.archivedAt === null,
  );
  const account = accounts.find((item) => item.id === (values.accountId ?? accounts[0]?.id));
  const methodIds: readonly Transaction.Method[] =
    account?.type === 'credit_card' ? CARD_METHODS : OTHER_METHODS;
  // Cash on hand is the likeliest thing to enter by hand, so a wallet starts on "Dinheiro".
  const defaultMethod = account?.type === 'wallet' ? 'cash' : methodIds[0];
  const method = values.method && methodIds.includes(values.method) ? values.method : defaultMethod;
  const categories = rankCategoriesByUse(
    buildCategoryOptions(
      model.categories.data?.items ?? [],
      values.type === 'income' ? 'income' : 'expense',
    ),
    model.monthTransactions.data?.items ?? [],
  );

  function change(patch: Partial<TransactionCreateValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  async function submit() {
    const body = {
      type: values.type,
      accountId: account?.id ?? '',
      method: method ?? 'other',
      description: values.description,
      amountCents: values.amountCents,
      occurredOn: values.date,
      ...(values.categoryId ? { categoryId: values.categoryId } : {}),
    };
    const parsed = createTransactionRequestSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(
        collectFieldErrors(
          parsed.error.issues,
          TRANSACTION_CREATE_FIELDS,
          (field) => TRANSACTION_CREATE_MESSAGES[field],
        ),
      );
      focusFirstInvalid();
      return;
    }
    try {
      const created = await model.createTransaction.mutateAsync(parsed.data);
      onClose();
      showUndoToast({
        message: `${created.description} lançada.`,
        onUndo: () => model.deleteTransaction.mutate(created.id),
      });
    } catch (error) {
      setErrors({});
      setFormError(describeTransactionError(error).message);
    }
  }

  return (
    <TransactionCreateView
      isOpen
      onClose={onClose}
      values={{ ...values, accountId: account?.id ?? null, method: method ?? null }}
      onChange={change}
      errors={errors}
      formError={formError}
      accounts={buildAccountChoices(accounts)}
      methods={methodIds.map((id) => ({ id, label: TRANSACTION_METHOD_CHOICES[id] }))}
      categories={categories}
      loading={model.accounts.isPending || model.categories.isPending}
      saving={model.createTransaction.isPending}
      onSubmit={() => void submit()}
    />
  );
}
