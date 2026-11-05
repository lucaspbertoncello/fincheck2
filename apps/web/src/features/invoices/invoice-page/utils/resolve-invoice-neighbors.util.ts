import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

/**
 * The invoice before and the one after, as far as there are some: the one before exists when the
 * API has a total for it (`previousTotalCents`); the one after, up to the last month the card
 * lists (the projected ones).
 */
export function resolveInvoiceNeighbors(
  month: string,
  hasPrevious: boolean,
  listedMonths: readonly string[],
): { previous: string | null; next: string | null } {
  const last = [...listedMonths].sort().at(-1);

  return {
    previous: hasPrevious ? shiftMonthKey(month, -1) : null,
    next: last !== undefined && month < last ? shiftMonthKey(month, 1) : null,
  };
}
