const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

type DayParts = { year: number; month: number; day: number; weekday: number };

/** Splits a business date (`YYYY-MM-DD`) without any time zone: the weekday comes from UTC. */
export function parseBusinessDate(date: string): DayParts {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

/** "dom". */
export function weekdayShort(date: string): string {
  return WEEKDAYS[parseBusinessDate(date).weekday] ?? '';
}

/** "dom, 25 de outubro". */
export function dayLongLabel(date: string): string {
  const { day, month, weekday } = parseBusinessDate(date);
  return `${WEEKDAYS[weekday]}, ${day} de ${MONTHS[month - 1]}`;
}
