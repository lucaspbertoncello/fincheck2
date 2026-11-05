import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

/** `2026-09` -> `setembro`: the month name in lower case, for sentences ("que setembro"). */
export function monthName(monthKey: string): string {
  return formatMonthParts(monthKey).monthLabel.toLowerCase();
}
