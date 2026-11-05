import { nationalHolidays } from '#/common/date/national-holidays.util.ts';

// Whether a business date (`YYYY-MM-DD`) is a national holiday of Brazil.
export function isNationalHoliday(date: string): boolean {
  return nationalHolidays(Number(date.slice(0, 4))).includes(date);
}
