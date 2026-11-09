import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The days from today to the end of the month, today included (22/10 gives 10; the last day, 1).
export function computeDaysRemaining(today: BusinessDate): number {
  return Month.containing(today).lastDay().day - today.day + 1;
}
