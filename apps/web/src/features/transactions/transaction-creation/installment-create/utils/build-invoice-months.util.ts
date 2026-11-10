import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

const OPTIONS = 4;

function toOption(id: string): { id: string; label: string } {
  const { monthLabel, yearLabel } = formatMonthParts(id);
  return { id, label: `${monthLabel} ${yearLabel}` };
}

/**
 * The invoice months to choose the first installment from: the purchase month and the next ones. An
 * edit passes the month the plan already has (`keep`), so it stays a choice even when it is past
 * those; the list is always in order.
 */
export function buildInvoiceMonths(
  purchaseOn: string,
  keep?: string,
): { id: string; label: string }[] {
  const purchaseMonth = /^\d{4}-\d{2}/.test(purchaseOn) ? purchaseOn.slice(0, 7) : null;
  if (!purchaseMonth) return [];

  const ids = Array.from({ length: OPTIONS }, (_, index) => shiftMonthKey(purchaseMonth, index));
  if (keep && !ids.includes(keep)) ids.push(keep);

  return ids.sort((a, b) => a.localeCompare(b)).map(toOption);
}
