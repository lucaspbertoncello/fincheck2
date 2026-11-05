import type { DayParts } from '#/components/day-strip/day-parts.type.ts';

/** Splits a business date (`YYYY-MM-DD`) without any time zone: the weekday comes from UTC. */
export function parseBusinessDate(date: string): DayParts {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}
