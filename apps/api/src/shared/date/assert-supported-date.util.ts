import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The same rule of years, for a date (the day of a card purchase, whose invoice is a month away).
export function assertSupportedDate(date: BusinessDate, path: string): void {
  assertSupportedMonth(Month.containing(date), path);
}
