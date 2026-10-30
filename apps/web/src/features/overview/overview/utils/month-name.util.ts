import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

/** `2026-09` -> `setembro`: the month name in lower case, for sentences ("que setembro"). */
export function monthName(monthKey: string): string {
  return formatMonthParts(monthKey).monthLabel.toLowerCase();
}

/** `2026-09` -> `set.`: the short form of the month, for the donut center ("+108% que set."). */
export function monthShortName(monthKey: string): string {
  return `${monthName(monthKey).slice(0, 3)}.`;
}
