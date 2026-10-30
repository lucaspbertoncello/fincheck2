import { allocateCents } from '@fincheck/shared/common/money/allocate-cents.util.ts';

import type { InstallmentPreview } from '#/features/transactions/transaction-creation/installment-create/types/installment-create-form.type.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

function monthLabel(monthKey: string): string {
  const { monthLabel: month, yearLabel } = formatMonthParts(monthKey);
  return `${month} ${yearLabel}`;
}

/**
 * The preview of the installments: each one's value (the first takes the leftover cents, the same
 * rule the API saves with) and the invoice month it falls on. Null until the form is valid enough.
 */
export function buildInstallmentPreview(
  totalCents: number,
  count: number,
  firstInvoiceMonth: string | null,
): InstallmentPreview | null {
  if (!firstInvoiceMonth || totalCents <= 0 || !Number.isInteger(count) || count < 2) return null;

  const amounts = allocateCents(totalCents, count);
  const rows = amounts.map((cents, index) => ({
    number: index + 1,
    monthLabel: monthLabel(shiftMonthKey(firstInvoiceMonth, index)),
    cents,
  }));

  return {
    count,
    totalCents,
    firstCents: amounts[0] ?? 0,
    restCents: amounts[1] ?? 0,
    firstMonthLabel: monthLabel(firstInvoiceMonth),
    lastMonthLabel: monthLabel(shiftMonthKey(firstInvoiceMonth, count - 1)),
    rows,
  };
}
