import { describe, expect, it } from 'vitest';

import { computeOccurrenceWindow } from '#/modules/recurrences/domain/occurrence/compute-occurrence-window.util.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const calendar = new BusinessCalendar();

function windowOf(rule: DateRule.Input, month: string) {
  const window = computeOccurrenceWindow(DateRule.create(rule), Month.of(month), calendar);

  return {
    expectedOn: window.expectedOn?.value ?? null,
    windowStartOn: window.windowStartOn.value,
    windowEndOn: window.windowEndOn.value,
  };
}

describe('computeOccurrenceWindow, fixed day (BR-REC-001)', () => {
  it('expects the day and takes 3 days of slack on each side (Q5)', () => {
    expect(windowOf({ type: 'fixed_day', day: 15 }, '2026-10')).toEqual({
      expectedOn: '2026-10-15',
      windowStartOn: '2026-10-12',
      windowEndOn: '2026-10-18',
    });
  });

  it.each([
    ['2026-02', 29, '2026-02-28'],
    ['2026-02', 30, '2026-02-28'],
    ['2026-02', 31, '2026-02-28'],
    ['2028-02', 29, '2028-02-29'],
    ['2028-02', 30, '2028-02-29'],
    ['2028-02', 31, '2028-02-29'],
    ['2026-04', 30, '2026-04-30'],
    ['2026-04', 31, '2026-04-30'],
    ['2026-12', 31, '2026-12-31'],
  ])('holds day %s-%i at the end of a shorter month: %s', (month, day, expected) => {
    expect(windowOf({ type: 'fixed_day', day }, month).expectedOn).toBe(expected);
  });

  it('does not move the day when the shift is none, even on a Saturday', () => {
    // 28/02/2026 is a Saturday.
    expect(windowOf({ type: 'fixed_day', day: 28 }, '2026-02').expectedOn).toBe('2026-02-28');
    expect(
      windowOf({ type: 'fixed_day', day: 28, nonBusinessDayShift: 'none' }, '2026-02').expectedOn,
    ).toBe('2026-02-28');
  });

  it('moves a Saturday to the business day before (Friday) or after (Monday, next month)', () => {
    expect(
      windowOf({ type: 'fixed_day', day: 28, nonBusinessDayShift: 'before' }, '2026-02'),
    ).toMatchObject({
      expectedOn: '2026-02-27',
      windowStartOn: '2026-02-24',
      windowEndOn: '2026-03-02',
    });
    expect(
      windowOf({ type: 'fixed_day', day: 28, nonBusinessDayShift: 'after' }, '2026-02'),
    ).toMatchObject({
      expectedOn: '2026-03-02',
      windowStartOn: '2026-02-27',
      windowEndOn: '2026-03-05',
    });
  });

  it('moves a Sunday (10/01/2027) to the Friday before or the Monday after (BR-REC-016)', () => {
    expect(
      windowOf({ type: 'fixed_day', day: 10, nonBusinessDayShift: 'before' }, '2027-01').expectedOn,
    ).toBe('2027-01-08');
    expect(
      windowOf({ type: 'fixed_day', day: 10, nonBusinessDayShift: 'after' }, '2027-01').expectedOn,
    ).toBe('2027-01-11');
  });

  it('moves a national holiday (12/10/2026, a Monday) to the business day before or after', () => {
    expect(
      windowOf({ type: 'fixed_day', day: 12, nonBusinessDayShift: 'before' }, '2026-10').expectedOn,
    ).toBe('2026-10-09');
    expect(
      windowOf({ type: 'fixed_day', day: 12, nonBusinessDayShift: 'after' }, '2026-10').expectedOn,
    ).toBe('2026-10-13');
  });

  it('keeps a day that is already a business day, whatever the shift', () => {
    expect(
      windowOf({ type: 'fixed_day', day: 15, nonBusinessDayShift: 'after' }, '2026-10').expectedOn,
    ).toBe('2026-10-15');
  });

  it('crosses the year: 01/01/2027 is a holiday, the business day before is 31/12/2026', () => {
    expect(
      windowOf({ type: 'fixed_day', day: 1, nonBusinessDayShift: 'before' }, '2027-01'),
    ).toEqual({
      expectedOn: '2026-12-31',
      windowStartOn: '2026-12-28',
      windowEndOn: '2027-01-03',
    });
  });

  it('has a window that crosses the year when the day is the 1st of January', () => {
    expect(windowOf({ type: 'fixed_day', day: 1 }, '2027-01')).toEqual({
      expectedOn: '2027-01-01',
      windowStartOn: '2026-12-29',
      windowEndOn: '2027-01-04',
    });
  });

  it('takes Carnival (16 and 17/02/2026) and Good Friday (03/04/2026) as non-business days', () => {
    expect(
      windowOf({ type: 'fixed_day', day: 16, nonBusinessDayShift: 'after' }, '2026-02').expectedOn,
    ).toBe('2026-02-18');
    expect(
      windowOf({ type: 'fixed_day', day: 3, nonBusinessDayShift: 'after' }, '2026-04').expectedOn,
    ).toBe('2026-04-06');
  });
});

describe('computeOccurrenceWindow, nth business day (BR-REC-002)', () => {
  it('counts the 5th business day of October 2026: 01, 02, 05, 06 and 07', () => {
    expect(windowOf({ type: 'business_day', businessDayNumber: 5 }, '2026-10')).toEqual({
      expectedOn: '2026-10-07',
      windowStartOn: '2026-10-01',
      windowEndOn: '2026-10-10',
    });
  });

  it('skips the holiday of 02/11/2026: the 5th business day of November is 09/11', () => {
    expect(windowOf({ type: 'business_day', businessDayNumber: 5 }, '2026-11').expectedOn).toBe(
      '2026-11-09',
    );
  });

  it('takes the last business day when the month has fewer than the n asked (the 23rd of February)', () => {
    // February 2026 has 20 weekdays and 2 of them are Carnival: 18 business days, the last is 27/02.
    expect(windowOf({ type: 'business_day', businessDayNumber: 23 }, '2026-02')).toEqual({
      expectedOn: '2026-02-27',
      windowStartOn: '2026-02-01',
      windowEndOn: '2026-03-02',
    });
  });

  it('takes the 1st business day of a month that starts on a weekend (01/11/2026 is a Sunday)', () => {
    // 02/11 is a holiday (Finados): the first business day of November 2026 is 03/11.
    expect(windowOf({ type: 'business_day', businessDayNumber: 1 }, '2026-11').expectedOn).toBe(
      '2026-11-03',
    );
  });
});

describe('computeOccurrenceWindow, around a day (BR-REC-003)', () => {
  it('takes the tolerance on each side', () => {
    expect(windowOf({ type: 'around_day', day: 25, toleranceDays: 2 }, '2026-10')).toEqual({
      expectedOn: '2026-10-25',
      windowStartOn: '2026-10-23',
      windowEndOn: '2026-10-27',
    });
  });

  it('does not move the day off a weekend: only the fixed day has a shift', () => {
    // 25/10/2026 is a Sunday.
    expect(windowOf({ type: 'around_day', day: 25, toleranceDays: 0 }, '2026-10')).toMatchObject({
      expectedOn: '2026-10-25',
      windowStartOn: '2026-10-25',
      windowEndOn: '2026-10-25',
    });
  });

  it('holds the day at the end of the month and lets the window cross into the next one', () => {
    expect(windowOf({ type: 'around_day', day: 31, toleranceDays: 5 }, '2026-04')).toEqual({
      expectedOn: '2026-04-30',
      windowStartOn: '2026-04-25',
      windowEndOn: '2026-05-05',
    });
  });

  it('takes a tolerance of 15 days across the year', () => {
    expect(windowOf({ type: 'around_day', day: 5, toleranceDays: 15 }, '2027-01')).toMatchObject({
      windowStartOn: '2026-12-21',
      windowEndOn: '2027-01-20',
    });
  });
});

describe('computeOccurrenceWindow, any day (BR-REC-004)', () => {
  it('has no expected day and the whole month for a window', () => {
    expect(windowOf({ type: 'any_day' }, '2026-10')).toEqual({
      expectedOn: null,
      windowStartOn: '2026-10-01',
      windowEndOn: '2026-10-31',
    });
  });

  it('expects the likely day when there is one, with the whole month as the window', () => {
    expect(windowOf({ type: 'any_day', day: 5 }, '2026-10')).toEqual({
      expectedOn: '2026-10-05',
      windowStartOn: '2026-10-01',
      windowEndOn: '2026-10-31',
    });
  });

  it('holds a likely day 31 at the end of February (leap and not)', () => {
    expect(windowOf({ type: 'any_day', day: 31 }, '2026-02').expectedOn).toBe('2026-02-28');
    expect(windowOf({ type: 'any_day', day: 31 }, '2028-02')).toMatchObject({
      expectedOn: '2028-02-29',
      windowEndOn: '2028-02-29',
    });
  });
});
