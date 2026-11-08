import { createInstallmentPlanRequestSchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { INSTALLMENT_LIMITS } from '@fincheck/shared/transactions/installment-plan/installment-plan.constant.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { buildCategoryOptions } from '#/features/transactions/utils/build-category-options.util.ts';
import { describeTransactionError } from '#/shared/utils/transactions/describe-transaction-error.util.ts';
import { focusFirstInvalid } from '#/features/transactions/utils/focus-first-invalid.util.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';
import { useInstallmentCreateModel } from '#/features/transactions/transaction-creation/installment-create/installment-create.model.ts';
import { InstallmentCreateView } from '#/features/transactions/transaction-creation/installment-create/installment-create.view.tsx';
import type {
  InstallmentCreateErrors,
  InstallmentCreateField,
  InstallmentCreateValues,
} from '#/features/transactions/transaction-creation/installment-create/types/installment-create-form.type.ts';
import { buildInstallmentPreview } from '#/features/transactions/transaction-creation/installment-create/utils/build-installment-preview.util.ts';
import { buildInvoiceMonths } from '#/features/transactions/transaction-creation/installment-create/utils/build-invoice-months.util.ts';
import { buildAccountChoices } from '#/shared/utils/build-account-choices.util.ts';
import { rankCategoriesByUse } from '#/features/transactions/utils/rank-categories-by-use.util.ts';
import { collectFieldErrors } from '#/shared/utils/forms/collect-field-errors.util.ts';

const FIELDS: Record<string, InstallmentCreateField> = {
  totalCents: 'total',
  description: 'description',
  installmentCount: 'count',
  accountId: 'account',
  purchaseOn: 'date',
  firstInvoiceMonth: 'firstInvoice',
};

const MESSAGES: Record<InstallmentCreateField, string> = {
  total: 'O valor total precisa ser maior que zero.',
  description: 'Escreva uma descrição.',
  count: `Informe de ${INSTALLMENT_LIMITS.min} a ${INSTALLMENT_LIMITS.max} parcelas.`,
  account: 'Escolha o cartão.',
  date: 'Escolha uma data válida.',
  firstInvoice: 'Escolha a primeira fatura.',
};

type Props = {
  onClose: () => void;
};

function initialValues(): InstallmentCreateValues {
  return {
    amountCents: 0,
    amountMode: 'total',
    description: '',
    categoryId: null,
    countText: '2',
    accountId: null,
    purchaseOn: getBusinessDate(new Date()),
    firstInvoiceMonth: null,
  };
}

/**
 * "Compra parcelada" (RF-INV-004). Open it with the `?new=installment` search param, from any screen.
 * The preview of the installments uses the same cent allocation as the API, so what is shown is what
 * is saved. A "Desfazer" toast deletes the plan.
 */
export function InstallmentCreateViewModel({ onClose }: Props) {
  const model = useInstallmentCreateModel();
  const { showUndoToast } = useToast();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<InstallmentCreateErrors>({});
  const [formError, setFormError] = useState<string>();

  const cards = (model.accounts.data?.items ?? []).filter(
    (account) => account.type === 'credit_card' && account.archivedAt === null,
  );
  const accountId = values.accountId ?? cards[0]?.id ?? null;
  const invoiceMonths = buildInvoiceMonths(values.purchaseOn);
  const firstInvoiceMonth = values.firstInvoiceMonth ?? invoiceMonths[0]?.id ?? null;
  const count = Number(values.countText);
  // The amount field holds the whole purchase or one installment; the API takes the total.
  const totalCents =
    values.amountMode === 'total'
      ? values.amountCents
      : Number.isInteger(count) && count >= 2
        ? values.amountCents * count
        : 0;

  async function submit() {
    const body = {
      accountId: accountId ?? '',
      description: values.description,
      totalCents,
      installmentCount: count,
      firstInvoiceMonth: firstInvoiceMonth ?? '',
      purchaseOn: values.purchaseOn,
      ...(values.categoryId ? { categoryId: values.categoryId } : {}),
    };
    const parsed = createInstallmentPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, MESSAGES, { fieldOf: FIELDS }));
      focusFirstInvalid();
      return;
    }
    try {
      const plan = await model.createPlan.mutateAsync(parsed.data);
      onClose();
      showUndoToast({
        message: `${plan.description} lançada em ${plan.installmentCount} parcelas.`,
        onUndo: () => model.deletePlan.mutate(plan.id),
      });
    } catch (error) {
      setErrors({});
      setFormError(describeTransactionError(error).message);
    }
  }

  return (
    <InstallmentCreateView
      isOpen
      onClose={onClose}
      values={{ ...values, accountId, firstInvoiceMonth }}
      onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
      errors={errors}
      formError={formError}
      cards={buildAccountChoices(cards)}
      categories={rankCategoriesByUse(
        buildCategoryOptions(model.categories.data?.items ?? [], 'expense'),
        model.monthTransactions.data?.items ?? [],
      )}
      invoiceMonths={invoiceMonths}
      preview={buildInstallmentPreview(totalCents, count, firstInvoiceMonth)}
      loading={model.accounts.isPending || model.categories.isPending}
      saving={model.createPlan.isPending}
      onSubmit={() => void submit()}
    />
  );
}
