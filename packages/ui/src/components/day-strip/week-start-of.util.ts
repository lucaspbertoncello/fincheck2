import { parseBusinessDate } from '#/components/day-strip/parse-business-date.util.ts';
import { shiftBusinessDate } from '#/components/day-strip/shift-business-date.util.ts';

/** The Sunday that opens the week of the date (Brazilian calendars start the week on Sunday). */
export function weekStartOf(date: string): string {
  return shiftBusinessDate(date, -parseBusinessDate(date).weekday);
}
