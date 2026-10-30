import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

const OPTIONS = 4;

/** The invoice months to choose the first installment from: the purchase month and the next ones. */
export function buildInvoiceMonths(purchaseOn: string): { id: string; label: string }[] {
  const purchaseMonth = /^\d{4}-\d{2}/.test(purchaseOn) ? purchaseOn.slice(0, 7) : null;
  if (!purchaseMonth) return [];

  return Array.from({ length: OPTIONS }, (_, index) => {
    const id = shiftMonthKey(purchaseMonth, index);
    const { monthLabel, yearLabel } = formatMonthParts(id);
    return { id, label: `${monthLabel} ${yearLabel}` };
  });
}
