import { MONTHS } from '#/components/day-strip/month-names.constant.ts';
import { parseBusinessDate } from '#/components/day-strip/parse-business-date.util.ts';

/** "27 a 31 de outubro", "31 de outubro" for one day, both months when the week crosses them. */
export function dayRangeLabel(start: string, end: string): string {
  const from = parseBusinessDate(start);
  const to = parseBusinessDate(end);
  if (start === end) return `${to.day} de ${MONTHS[to.month - 1]}`;
  if (from.month === to.month) return `${from.day} a ${to.day} de ${MONTHS[to.month - 1]}`;
  return `${from.day} de ${MONTHS[from.month - 1]} a ${to.day} de ${MONTHS[to.month - 1]}`;
}
