import {
  EASTER_BASED_HOLIDAY_OFFSETS,
  FIXED_NATIONAL_HOLIDAYS,
} from '#/common/date/date.constant.ts';
import { addDays } from '#/common/date/add-days.util.ts';
import { easterSunday } from '#/common/date/easter-sunday.util.ts';

// The national holidays of a year as `YYYY-MM-DD`, sorted: the fixed ones plus Carnival (Monday and
// Tuesday), Good Friday and Corpus Christi, which follow Easter. No table, no API.
export function nationalHolidays(year: number): string[] {
  const fixed = FIXED_NATIONAL_HOLIDAYS.filter(
    (holiday) => !('since' in holiday) || year >= holiday.since,
  ).map(
    (holiday) =>
      `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`,
  );
  const easter = easterSunday(year);
  const moving = EASTER_BASED_HOLIDAY_OFFSETS.map((offset) => addDays(easter, offset));

  return [...fixed, ...moving].sort();
}
