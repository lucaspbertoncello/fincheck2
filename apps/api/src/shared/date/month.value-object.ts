import { monthSchema } from '@fincheck/shared/common/date/date.schema.ts';

import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { daysInMonth } from '#/shared/date/days-in-month.util.ts';
import { padNumber } from '#/shared/date/pad-number.util.ts';

// A month, `YYYY-MM`: the unit of an invoice, an occurrence and an installment plan. Immutable.
export class Month {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static of(value: string): Month {
    if (!monthSchema.safeParse(value).success) {
      throw new RangeError(`Not a month (YYYY-MM): ${value}`);
    }

    return new Month(value);
  }

  static containing(date: BusinessDate): Month {
    return new Month(date.value.slice(0, 7));
  }

  get year(): number {
    return Number(this.value.slice(0, 4));
  }

  // 1 to 12.
  get monthNumber(): number {
    return Number(this.value.slice(5, 7));
  }

  firstDay(): BusinessDate {
    return BusinessDate.fromParts(this.year, this.monthNumber, 1);
  }

  lastDay(): BusinessDate {
    return BusinessDate.fromParts(
      this.year,
      this.monthNumber,
      daysInMonth(this.year, this.monthNumber),
    );
  }

  previous(): Month {
    return this.shift(-1);
  }

  next(): Month {
    return this.shift(1);
  }

  equals(other: Month): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private shift(months: number): Month {
    const total = this.year * 12 + (this.monthNumber - 1) + months;
    const year = Math.floor(total / 12);

    return Month.of(`${padNumber(year, 4)}-${padNumber(total - year * 12 + 1, 2)}`);
  }
}
