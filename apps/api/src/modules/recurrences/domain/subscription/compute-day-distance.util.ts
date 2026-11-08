import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// How many days apart two charges are on the "day of the month" circle: a card that charges on the
// 30th one month and on the 2nd the next is 3 days apart, not 28. The older day is read in the
// month of the newer one (held at its end if that month is shorter).
export function computeDayDistance(newer: BusinessDate, older: BusinessDate): number {
  const length = Month.containing(newer).lastDay().day;
  const olderDay = Math.min(older.day, length);
  const gap = Math.abs(newer.day - olderDay);

  return Math.min(gap, length - gap);
}
