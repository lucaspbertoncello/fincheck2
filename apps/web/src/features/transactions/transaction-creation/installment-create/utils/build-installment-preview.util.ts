import { allocateCents } from '@fincheck/shared/common/money/allocate-cents.util.ts';

import type { InstallmentPreviewRow } from '#/features/transactions/transaction-creation/installment-create/types/installment-create-form.type.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

const SHOWN_ROWS = 4;

/**
 * The preview of the installments: each one's value (the first takes the leftover cents, the same
 * rule the API saves with) and the invoice month it falls on. Shows the first rows and counts the rest.
 */
export function buildInstallmentPreview(
  totalCents: number,
  count: number,
  firstInvoiceMonth: string | null,
): { rows: InstallmentPreviewRow[]; count: number; hiddenCount: number } {
  if (!firstInvoiceMonth || totalCents <= 0 || !Number.isInteger(count) || count < 2) {
    return { rows: [], count: 0, hiddenCount: 0 };
  }
  const amounts = allocateCents(totalCents, count);
  const rows = amounts.slice(0, SHOWN_ROWS).map((cents, index) => {
    const { monthLabel, yearLabel } = formatMonthParts(shiftMonthKey(firstInvoiceMonth, index));
    return { number: index + 1, monthLabel: `${monthLabel} ${yearLabel}`, cents };
  });

  return { rows, count, hiddenCount: Math.max(count - rows.length, 0) };
}
