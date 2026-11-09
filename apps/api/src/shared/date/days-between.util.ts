import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const MS_PER_DAY = 86_400_000;

// The whole days from `from` to `to` (negative when `to` is earlier). Through UTC midnights, so the
// summer time of any zone never makes a day 23 or 25 hours.
export function daysBetween(from: BusinessDate, to: BusinessDate): number {
  const at = (date: BusinessDate) => Date.UTC(date.year, date.monthNumber - 1, date.day);

  return Math.round((at(to) - at(from)) / MS_PER_DAY);
}
