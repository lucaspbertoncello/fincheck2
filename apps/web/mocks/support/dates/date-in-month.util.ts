import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';

// The business date for `day` in `month`; a day past the end of the month is held at the last day.
export function dateInMonth(month: string, day: number): string {
  const safeDay = Math.min(Math.max(day, 1), daysInMonth(month));

  return `${month}-${String(safeDay).padStart(2, '0')}`;
}
