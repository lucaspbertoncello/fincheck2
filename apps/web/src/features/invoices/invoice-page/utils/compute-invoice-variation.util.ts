import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

/**
 * How this invoice compares with the one before ("+12% que setembro"): a ratio of two totals the
 * API already sends, for the badge. Null when there is no invoice before or it was zero or a
 * credit (nothing to compare against).
 */
export function computeInvoiceVariation(
  totalCents: number,
  previousTotalCents: number | null,
  month: string,
): { percent: number; reference: string } | null {
  if (previousTotalCents === null || previousTotalCents <= 0) return null;

  const reference = formatMonthParts(shiftMonthKey(month, -1)).monthLabel.toLowerCase();

  return {
    percent: Math.round(((totalCents - previousTotalCents) / previousTotalCents) * 1000) / 10,
    reference,
  };
}
