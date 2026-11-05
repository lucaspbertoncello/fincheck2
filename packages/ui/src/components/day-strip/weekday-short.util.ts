import { WEEKDAYS } from '#/components/day-strip/weekdays.constant.ts';
import { parseBusinessDate } from '#/components/day-strip/parse-business-date.util.ts';

/** "dom". */
export function weekdayShort(date: string): string {
  return WEEKDAYS[parseBusinessDate(date).weekday] ?? '';
}
