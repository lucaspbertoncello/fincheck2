import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

/** `2026-12` -> `dezembro de 2026`, to read inside a sentence. */
export function formatMonthLong(monthKey: string): string {
  const { monthLabel, yearLabel } = formatMonthParts(monthKey);
  return `${monthLabel.toLowerCase()} de ${yearLabel}`;
}
