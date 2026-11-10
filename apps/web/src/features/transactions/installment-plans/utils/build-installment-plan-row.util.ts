import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { buildInstallmentPlanProgress } from '#/domain/transactions/installment-plan/rules/build-installment-plan-progress.rule.ts';
import type { InstallmentPlanRowData } from '#/features/transactions/installment-plans/types/installment-plans.type.ts';
import { formatMonthShort } from '#/features/transactions/installment-plans/utils/format-month-short.util.ts';
import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';

/** A plan of the card as a row: the category mark, where it stands, what is left and every installment. */
export function buildInstallmentPlanRow(
  plan: InstallmentPlan.Dto,
  categories: readonly Category.Dto[],
): InstallmentPlanRowData {
  const progress = buildInstallmentPlanProgress(plan);
  const category = categories.find((item) => item.id === plan.categoryId);
  const first = `primeira fatura ${formatMonthShort(plan.firstInvoiceMonth)}`;

  return {
    id: plan.id,
    name: plan.description,
    icon: category ? mapCategoryIcon(category.icon) : 'card',
    uncategorized: !category,
    detail: progress.isSettled
      ? `Quitada · ${plan.installmentCount} parcelas · ${first}`
      : `${progress.partLabel} · ${first}`,
    totalCents: plan.totalCents,
    remainingCents: plan.remainingCents,
    isSettled: progress.isSettled,
    isFromBank: plan.origin === 'bank',
    installments: [...plan.installments]
      .sort((a, b) => a.number - b.number)
      .map((item) => ({
        number: item.number,
        dateLabel: formatShortDate(item.occurredOn),
        label: `${item.number}/${plan.installmentCount} · fatura de ${formatMonthShort(item.invoiceMonth)}`,
        cents: item.amountCents,
        isNext: item.number === progress.currentNumber,
      })),
  };
}
