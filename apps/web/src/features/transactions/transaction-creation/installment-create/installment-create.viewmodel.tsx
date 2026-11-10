import { INSTALLMENT_LIMITS } from '@fincheck/shared/transactions/installment-plan/installment-plan.constant.ts';
import {
  createInstallmentPlanRequestSchema,
  updateInstallmentPlanRequestSchema,
} from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { buildCategoryOptions } from '#/shared/utils/transactions/build-category-options.util.ts';
import { describeInstallmentPlanError } from '#/shared/utils/transactions/describe-installment-plan-error.util.ts';
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
import { formatPurchaseDate } from '#/features/transactions/transaction-creation/installment-create/utils/format-purchase-date.util.ts';
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
  /** Launches the purchase on this card: the card is text, not a choice (the page of the card). */
  cardId?: string;
  /** Edits this plan: the form opens filled, the card and the purchase day are text. */
  plan?: InstallmentPlan.Dto;
};

function initialValues(
  plan: InstallmentPlan.Dto | undefined,
  cardId: string | undefined,
): InstallmentCreateValues {
  if (plan) {
    return {
      amountCents: plan.totalCents,
      amountMode: 'total',
      description: plan.description,
      categoryId: plan.categoryId,
      countText: String(plan.installmentCount),
      accountId: plan.accountId,
      purchaseOn: plan.purchaseOn,
      firstInvoiceMonth: plan.firstInvoiceMonth,
    };
  }

  return {
    amountCents: 0,
    amountMode: 'total',
    description: '',
    categoryId: null,
    countText: '2',
    accountId: cardId ?? null,
    purchaseOn: getBusinessDate(new Date()),
    firstInvoiceMonth: null,
  };
}

/**
 * "Compra parcelada" (RF-INV-004), to launch a purchase and to edit a plan. Open it with the
 * `?new=installment` search param, from any screen, or from the page of a card (`cardId`, the card
 * is fixed) and its "Editar" (`plan`). The preview of the installments uses the same cent allocation
 * as the API, so what is shown is what is saved. Launching offers a "Desfazer" toast that deletes the
 * plan; editing sends only what changed and has no undo.
 */
export function InstallmentCreateViewModel({ onClose, cardId, plan }: Props) {
  const model = useInstallmentCreateModel();
  const { showUndoToast } = useToast();
  const [values, setValues] = useState<InstallmentCreateValues>(() => initialValues(plan, cardId));
  const [errors, setErrors] = useState<InstallmentCreateErrors>({});
  const [formError, setFormError] = useState<string>();

  const isEdit = plan !== undefined;
  const accounts = model.accounts.data?.items ?? [];
  const cards = accounts.filter(
    (account) => account.type === 'credit_card' && account.archivedAt === null,
  );
  const lockedCardId = plan?.accountId ?? cardId;
  const lockedCardName = lockedCardId
    ? (accounts.find((account) => account.id === lockedCardId)?.name ?? '')
    : undefined;
  const accountId = values.accountId ?? cards[0]?.id ?? null;
  const invoiceMonths = buildInvoiceMonths(values.purchaseOn, plan?.firstInvoiceMonth);
  const firstInvoiceMonth = values.firstInvoiceMonth ?? invoiceMonths[0]?.id ?? null;
  const count = Number(values.countText);
  // The amount field holds the whole purchase or one installment; the API takes the total.
  const totalCents =
    values.amountMode === 'total'
      ? values.amountCents
      : Number.isInteger(count) && count >= 2
        ? values.amountCents * count
        : 0;
  const showsRecalculation =
    plan !== undefined &&
    (totalCents !== plan.totalCents ||
      count !== plan.installmentCount ||
      firstInvoiceMonth !== plan.firstInvoiceMonth);

  function showFailure(error: unknown) {
    setErrors({});
    setFormError(describeInstallmentPlanError(error));
  }

  async function submitCreate() {
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
      const created = await model.createPlan.mutateAsync(parsed.data);
      onClose();
      showUndoToast({
        message: `${created.description} lançada em ${created.installmentCount} parcelas.`,
        onUndo: () => model.deletePlan.mutate(created.id),
      });
    } catch (error) {
      showFailure(error);
    }
  }

  async function submitEdit(current: InstallmentPlan.Dto) {
    // Only what changed goes out; the API keeps the rest as it is.
    const description = values.description.trim();
    const body = {
      ...(description !== current.description ? { description } : {}),
      ...(totalCents !== current.totalCents ? { totalCents } : {}),
      ...(count !== current.installmentCount ? { installmentCount: count } : {}),
      ...(firstInvoiceMonth !== current.firstInvoiceMonth
        ? { firstInvoiceMonth: firstInvoiceMonth ?? '' }
        : {}),
      ...(values.categoryId !== current.categoryId ? { categoryId: values.categoryId } : {}),
    };
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    const parsed = updateInstallmentPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, MESSAGES, { fieldOf: FIELDS }));
      focusFirstInvalid();
      return;
    }
    try {
      const updated = await model.updatePlan.mutateAsync({ id: current.id, body: parsed.data });
      onClose();
      showUndoToast({
        message: `${updated.description} atualizada.`,
        actionLabel: 'Ok',
        onUndo: () => undefined,
        timeout: 4000,
      });
    } catch (error) {
      showFailure(error);
    }
  }

  return (
    <InstallmentCreateView
      isOpen
      mode={isEdit ? 'edit' : 'create'}
      onClose={onClose}
      values={{ ...values, accountId, firstInvoiceMonth }}
      onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
      errors={errors}
      formError={formError}
      cards={buildAccountChoices(cards)}
      lockedCard={lockedCardName}
      lockedPurchaseDate={plan ? formatPurchaseDate(plan.purchaseOn) : undefined}
      categories={rankCategoriesByUse(
        buildCategoryOptions(model.categories.data?.items ?? [], 'expense'),
        model.monthTransactions.data?.items ?? [],
      )}
      invoiceMonths={invoiceMonths}
      preview={buildInstallmentPreview(totalCents, count, firstInvoiceMonth)}
      showsRecalculation={showsRecalculation}
      loading={model.accounts.isPending || model.categories.isPending}
      saving={model.createPlan.isPending || model.updatePlan.isPending}
      onSubmit={() => void (plan ? submitEdit(plan) : submitCreate())}
    />
  );
}
