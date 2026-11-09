import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { daysInMonth } from '#/shared/date/days-in-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The last day of the month that has spending to show: today in the current month, the last day
// in a past one, none (0) in a future one.
export function computeLastDayShown(month: Month, today: BusinessDate): number {
  const current = Month.containing(today);
  if (month.equals(current)) return today.day;

  return month.value < current.value ? daysInMonth(month.year, month.monthNumber) : 0;
}
