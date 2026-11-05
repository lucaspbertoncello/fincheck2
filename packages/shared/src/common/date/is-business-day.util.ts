import { isNationalHoliday } from '#/common/date/is-national-holiday.util.ts';
import { weekdayOf } from '#/common/date/weekday-of.util.ts';

// Monday to Friday that is not a national holiday.
export function isBusinessDay(date: string): boolean {
  const weekday = weekdayOf(date);

  return weekday !== 0 && weekday !== 6 && !isNationalHoliday(date);
}
