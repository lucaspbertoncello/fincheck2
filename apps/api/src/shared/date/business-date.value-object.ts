import { addDays } from '@fincheck/shared/common/date/add-days.util.ts';
import { businessDateSchema } from '@fincheck/shared/common/date/date.schema.ts';
import { weekdayOf } from '@fincheck/shared/common/date/weekday-of.util.ts';

import { daysInMonth } from '#/shared/date/days-in-month.util.ts';
import { padNumber } from '#/shared/date/pad-number.util.ts';

// A day of the business, `YYYY-MM-DD`, in America/Sao_Paulo. It has no hour and never goes through
// `new Date('YYYY-MM-DD')` (that parses as UTC midnight and slips a day back in Brazil). Immutable.
export class BusinessDate {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static of(value: string): BusinessDate {
    if (!businessDateSchema.safeParse(value).success) {
      throw new RangeError(`Not a business date (YYYY-MM-DD): ${value}`);
    }

    return new BusinessDate(value);
  }

  static fromParts(year: number, month: number, day: number): BusinessDate {
    return BusinessDate.of(`${padNumber(year, 4)}-${padNumber(month, 2)}-${padNumber(day, 2)}`);
  }

  get year(): number {
    return Number(this.value.slice(0, 4));
  }

  // 1 to 12.
  get monthNumber(): number {
    return Number(this.value.slice(5, 7));
  }

  get day(): number {
    return Number(this.value.slice(8, 10));
  }

  // 0 is Sunday, 6 is Saturday.
  weekday(): number {
    return weekdayOf(this.value);
  }

  addDays(days: number): BusinessDate {
    return new BusinessDate(addDays(this.value, days));
  }

  // Keeps the day, held at the end of the month when it does not exist there (31/01 + 1 month is
  // 28/02, or 29/02 in a leap year).
  addMonths(months: number): BusinessDate {
    const total = this.year * 12 + (this.monthNumber - 1) + months;
    const year = Math.floor(total / 12);
    const month = total - year * 12 + 1;

    return BusinessDate.fromParts(year, month, Math.min(this.day, daysInMonth(year, month)));
  }

  equals(other: BusinessDate): boolean {
    return this.value === other.value;
  }

  isBefore(other: BusinessDate): boolean {
    return this.value < other.value;
  }

  toString(): string {
    return this.value;
  }
}
