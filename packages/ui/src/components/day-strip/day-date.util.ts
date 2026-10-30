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

const DAY_MS = 86_400_000;

/** Moves a business date by whole days, with no time zone: `("2026-10-31", 1)` is "2026-11-01". */
export function shiftBusinessDate(date: string, days: number): string {
  const { year, month, day } = parseBusinessDate(date);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Sunday that opens the week of the date (Brazilian calendars start the week on Sunday). */
export function weekStartOf(date: string): string {
  return shiftBusinessDate(date, -parseBusinessDate(date).weekday);
}

/** "27 a 31 de outubro", "31 de outubro" for one day, both months when the week crosses them. */
export function dayRangeLabel(start: string, end: string): string {
  const from = parseBusinessDate(start);
  const to = parseBusinessDate(end);
  if (start === end) return `${to.day} de ${MONTHS[to.month - 1]}`;
  if (from.month === to.month) return `${from.day} a ${to.day} de ${MONTHS[to.month - 1]}`;
  return `${from.day} de ${MONTHS[from.month - 1]} a ${to.day} de ${MONTHS[to.month - 1]}`;
}
