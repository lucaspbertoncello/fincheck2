import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The day of the month, held at its end when the month is shorter (day 31 in April is 30/04, day
// 30 in February is 28/02 or 29/02 in a leap year).
export function clampDayToMonth(month: Month, day: number): BusinessDate {
  const last = month.lastDay();

  return day >= last.day ? last : month.firstDay().addDays(day - 1);
}
