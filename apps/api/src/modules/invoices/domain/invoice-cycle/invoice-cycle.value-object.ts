import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { daysBetween } from '#/shared/date/days-between.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// How far the due date of the bank may be from the one of the cycle and still be the same invoice.
const MAX_DUE_DATE_DISTANCE_DAYS = 7;

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

  // The invoice (month of the closing) a due date that the bank informed belongs to: the month whose
  // due date, by this cycle, is the closest to it (the bank may move the day, a weekend or a holiday
  // differently from the calendar here). `null` when none is within a week, so a bill of another
  // cycle (the closing day changed) is not put on the wrong invoice.
  monthDueOn(dueOn: BusinessDate, calendar: BusinessCalendar): Month | null {
    const around = Month.containing(dueOn);
    let best: { month: Month; distance: number } | null = null;

    for (const month of [around.previous(), around, around.next()]) {
      const distance = Math.abs(daysBetween(this.dueOn(month, calendar), dueOn));
      if (best === null || distance < best.distance) best = { month, distance };
    }

    return best !== null && best.distance <= MAX_DUE_DATE_DISTANCE_DAYS ? best.month : null;
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
