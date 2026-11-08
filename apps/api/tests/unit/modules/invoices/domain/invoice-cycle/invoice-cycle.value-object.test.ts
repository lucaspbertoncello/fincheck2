import { describe, expect, it } from 'vitest';

import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const calendar = new BusinessCalendar();
const month = (value: string) => Month.of(value);
const date = (value: string) => BusinessDate.of(value);

describe('InvoiceCycle constructor', () => {
  it('keeps the closing day and the due day', () => {
    const cycle = new InvoiceCycle(30, 6);

    expect(cycle.closingDay).toBe(30);
    expect(cycle.dueDay).toBe(6);
  });

  it('accepts the limits 1 and 31', () => {
    expect(() => new InvoiceCycle(1, 31)).not.toThrow();
    expect(() => new InvoiceCycle(31, 1)).not.toThrow();
  });

  it.each([0, 32, -1, 1.5, Number.NaN])('rejects the closing day %s', (day) => {
    expect(() => new InvoiceCycle(day, 6)).toThrow(RangeError);
  });

  it.each([0, 32, -1, 1.5, Number.NaN])('rejects the due day %s', (day) => {
    expect(() => new InvoiceCycle(5, day)).toThrow(RangeError);
  });
});

describe('InvoiceCycle.closesOn', () => {
  it('is the closing day of the month of the invoice', () => {
    expect(new InvoiceCycle(30, 6).closesOn(month('2026-10')).value).toBe('2026-10-30');
    expect(new InvoiceCycle(5, 12).closesOn(month('2026-11')).value).toBe('2026-11-05');
  });

  it('does not move to a business day', () => {
    // 2026-11-01 is a Sunday, 2026-11-07 a Saturday.
    expect(new InvoiceCycle(1, 10).closesOn(month('2026-11')).value).toBe('2026-11-01');
    expect(new InvoiceCycle(7, 15).closesOn(month('2026-11')).value).toBe('2026-11-07');
  });

  it.each([29, 30, 31])('holds the closing day %s at the 28th of February 2026', (day) => {
    expect(new InvoiceCycle(day, 6).closesOn(month('2026-02')).value).toBe('2026-02-28');
  });

  it.each([29, 30, 31])('holds the closing day %s at the 29th of February 2028 (leap)', (day) => {
    expect(new InvoiceCycle(day, 6).closesOn(month('2028-02')).value).toBe('2028-02-29');
  });

  it('keeps the 28th of February in a leap year as the 28th', () => {
    expect(new InvoiceCycle(28, 6).closesOn(month('2028-02')).value).toBe('2028-02-28');
  });

  it.each(['2026-04', '2026-06', '2026-09', '2026-11'])(
    'holds the closing day 31 at the 30th in the 30-day month %s',
    (value) => {
      expect(new InvoiceCycle(31, 6).closesOn(month(value)).value).toBe(`${value}-30`);
    },
  );

  it.each(['2026-04', '2026-06', '2026-09', '2026-11'])(
    'holds the closing day 30 at the 30th in the 30-day month %s',
    (value) => {
      expect(new InvoiceCycle(30, 6).closesOn(month(value)).value).toBe(`${value}-30`);
    },
  );

  it('keeps the closing day 30 in a 31-day month', () => {
    expect(new InvoiceCycle(30, 6).closesOn(month('2026-12')).value).toBe('2026-12-30');
  });

  it('keeps the closing day 31 in a 31-day month', () => {
    expect(new InvoiceCycle(31, 6).closesOn(month('2026-12')).value).toBe('2026-12-31');
  });
});

describe('InvoiceCycle.dueOn', () => {
  it('closes on the 30th and falls due on the 6th of the next month', () => {
    expect(new InvoiceCycle(30, 6).dueOn(month('2026-10'), calendar).value).toBe('2026-11-06');
  });

  it('moves a due date on a Sunday to the next business day', () => {
    // 2026-12-06 is a Sunday.
    expect(new InvoiceCycle(30, 6).dueOn(month('2026-11'), calendar).value).toBe('2026-12-07');
  });

  it('moves a due date on a Saturday to the next business day', () => {
    // 2026-11-14 is a Saturday.
    expect(new InvoiceCycle(5, 14).dueOn(month('2026-11'), calendar).value).toBe('2026-11-16');
  });

  it('moves a due date on a weekday holiday to the next business day', () => {
    // 2026-10-12 is a Monday and a national holiday.
    expect(new InvoiceCycle(5, 12).dueOn(month('2026-10'), calendar).value).toBe('2026-10-13');
  });

  it('moves a due date on a weekend holiday past the weekend', () => {
    // 2026-11-15 is a Sunday and a national holiday.
    expect(new InvoiceCycle(5, 15).dueOn(month('2026-11'), calendar).value).toBe('2026-11-16');
  });

  it('uses the same month when the due day is after the closing day', () => {
    expect(new InvoiceCycle(20, 28).dueOn(month('2026-10'), calendar).value).toBe('2026-10-28');
    expect(new InvoiceCycle(5, 12).dueOn(month('2026-11'), calendar).value).toBe('2026-11-12');
  });

  it('uses the next month when the due day equals the closing day', () => {
    expect(new InvoiceCycle(10, 10).dueOn(month('2026-10'), calendar).value).toBe('2026-11-10');
  });

  it('uses the next month when the due day is before the closing day', () => {
    expect(new InvoiceCycle(20, 5).dueOn(month('2026-10'), calendar).value).toBe('2026-11-05');
  });

  it('crosses the year: closes on 20/12 and falls due on 05/01', () => {
    const cycle = new InvoiceCycle(20, 5);

    expect(cycle.closesOn(month('2026-12')).value).toBe('2026-12-20');
    expect(cycle.dueOn(month('2026-12'), calendar).value).toBe('2027-01-05');
  });

  it('holds a due day past the end of the month at its last day', () => {
    // 2026-04-30 is a Thursday.
    expect(new InvoiceCycle(5, 31).dueOn(month('2026-04'), calendar).value).toBe('2026-04-30');
  });

  it('holds the due day at the end of February before moving it to a business day', () => {
    // Closes on the 31st, due on the 30th (before the closing): the due is in March of a
    // non-leap year and the day is held at the 30th, a Monday.
    expect(new InvoiceCycle(31, 30).dueOn(month('2026-02'), calendar).value).toBe('2026-03-30');
    // Closes on the 10th, due on the 31st, same month: February ends on Saturday the 28th.
    expect(new InvoiceCycle(10, 31).dueOn(month('2026-02'), calendar).value).toBe('2026-03-02');
  });
});

describe('InvoiceCycle.monthFor', () => {
  const cycle = new InvoiceCycle(6, 14);

  it('puts a purchase before the closing day in the invoice of its own month', () => {
    expect(cycle.monthFor(date('2026-11-05')).value).toBe('2026-11');
  });

  it('puts a purchase exactly on the closing day in the invoice of its own month', () => {
    expect(cycle.monthFor(date('2026-11-06')).value).toBe('2026-11');
  });

  it('puts a purchase the day after the closing in the next month', () => {
    expect(cycle.monthFor(date('2026-11-07')).value).toBe('2026-12');
  });

  it('puts a purchase at the end of the month in the next month', () => {
    expect(cycle.monthFor(date('2026-11-30')).value).toBe('2026-12');
  });

  it('crosses the year: a purchase on 31/12 with closing on the 5th goes in January', () => {
    expect(new InvoiceCycle(5, 12).monthFor(date('2026-12-31')).value).toBe('2027-01');
  });

  it('keeps a purchase on 01/01 with closing on the 5th in January', () => {
    expect(new InvoiceCycle(5, 12).monthFor(date('2027-01-01')).value).toBe('2027-01');
  });

  it('closing on the 1st: a purchase on the 1st stays, the 2nd goes to the next month', () => {
    const first = new InvoiceCycle(1, 10);

    expect(first.monthFor(date('2026-11-01')).value).toBe('2026-11');
    expect(first.monthFor(date('2026-11-02')).value).toBe('2026-12');
  });

  it('closing on the 31st: a purchase on the last day of a short month stays', () => {
    const last = new InvoiceCycle(31, 10);

    expect(last.monthFor(date('2026-02-28')).value).toBe('2026-02');
    expect(last.monthFor(date('2026-04-30')).value).toBe('2026-04');
    expect(last.monthFor(date('2028-02-29')).value).toBe('2028-02');
  });

  it('closing on the 30th: a purchase on 28/02 (non-leap) stays, on 01/03 stays in March', () => {
    const cycle30 = new InvoiceCycle(30, 10);

    expect(cycle30.monthFor(date('2026-02-28')).value).toBe('2026-02');
    expect(cycle30.monthFor(date('2026-03-01')).value).toBe('2026-03');
  });

  it('closing on the 29th: a purchase on the last day of February stays in both years', () => {
    const cycle29 = new InvoiceCycle(29, 10);

    expect(cycle29.monthFor(date('2026-02-28')).value).toBe('2026-02');
    expect(cycle29.monthFor(date('2028-02-28')).value).toBe('2028-02');
    expect(cycle29.monthFor(date('2028-02-29')).value).toBe('2028-02');
  });

  it('closing on the 28th in February 2028: the 29th goes to March', () => {
    expect(new InvoiceCycle(28, 10).monthFor(date('2028-02-29')).value).toBe('2028-03');
  });
});

describe('InvoiceCycle with the clock of Sao Paulo', () => {
  const cycle = new InvoiceCycle(6, 14);

  it('reads 23:30 in Sao Paulo as the same day, even after midnight UTC', () => {
    const clock = createFixedClock('2026-11-07T01:30:00.000Z');

    expect(clock.today().value).toBe('2026-11-06');
  });

  it('keeps the open invoice of a card that closes on the 6th at November at 23:30 of the 6th', () => {
    const clock = createFixedClock('2026-11-07T01:30:00.000Z');

    expect(cycle.monthFor(clock.today()).value).toBe('2026-11');
  });

  it('opens December at 01:00 of the 7th in Sao Paulo', () => {
    const clock = createFixedClock('2026-11-07T04:00:00.000Z');

    expect(clock.today().value).toBe('2026-11-07');
    expect(cycle.monthFor(clock.today()).value).toBe('2026-12');
  });
});
