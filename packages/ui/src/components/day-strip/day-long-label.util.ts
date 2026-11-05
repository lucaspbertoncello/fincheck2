import { MONTHS } from '#/components/day-strip/month-names.constant.ts';
import { WEEKDAYS } from '#/components/day-strip/weekdays.constant.ts';
import { parseBusinessDate } from '#/components/day-strip/parse-business-date.util.ts';

/** "dom, 25 de outubro". */
export function dayLongLabel(date: string): string {
  const { day, month, weekday } = parseBusinessDate(date);
  return `${WEEKDAYS[weekday]}, ${day} de ${MONTHS[month - 1]}`;
}
