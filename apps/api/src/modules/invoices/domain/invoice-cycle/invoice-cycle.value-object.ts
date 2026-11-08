import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The cycle of a card: its closing day and its due day. Pure rules, no database and no clock; the
// invoice is named by the month of its **closing** (the one that closes on 30/10 and is due on
// 06/11 is the invoice of `2026-10`).
//
// - The closing falls on the closing day of the month, held at the last day of a short month (the
//   31st in February is the 28th, or the 29th). It never moves to a business day.
// - The due date is the due day of the month of the closing when that day is after the closing
//   day, otherwise of the next month; on a weekend or holiday it moves to the next business day
//   (Q4).
// - A purchase until the closing (inclusive) goes in the invoice of its month; after it, in the
//   next one (BR-INV-001). The open invoice today is the one that purchase of today would fall in.
export class InvoiceCycle {
  readonly closingDay: number;
  readonly dueDay: number;

  constructor(closingDay: number, dueDay: number) {
    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
      throw new RangeError(`The closing day is 1 to 31, got ${String(closingDay)}`);
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      throw new RangeError(`The due day is 1 to 31, got ${String(dueDay)}`);
    }

    this.closingDay = closingDay;
    this.dueDay = dueDay;
  }

  closesOn(month: Month): BusinessDate {
    return this.dayOf(month, this.closingDay);
  }

  dueOn(month: Month, calendar: BusinessCalendar): BusinessDate {
    const dueMonth = this.dueDay > this.closingDay ? month : month.next();

    return calendar.nextBusinessDay(this.dayOf(dueMonth, this.dueDay));
  }

  // The invoice (month of the closing) a purchase made on `date` falls in.
  monthFor(date: BusinessDate): Month {
    const month = Month.containing(date);

    return date.day <= this.closesOn(month).day ? month : month.next();
  }

  private dayOf(month: Month, day: number): BusinessDate {
    return BusinessDate.fromParts(
      month.year,
      month.monthNumber,
      Math.min(day, month.lastDay().day),
    );
  }
}
