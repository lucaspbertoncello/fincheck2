import { parseBusinessDate } from '#/components/day-strip/parse-business-date.util.ts';

const DAY_MS = 86_400_000;

/** Moves a business date by whole days, with no time zone: `("2026-10-31", 1)` is "2026-11-01". */
export function shiftBusinessDate(date: string, days: number): string {
  const { year, month, day } = parseBusinessDate(date);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}
