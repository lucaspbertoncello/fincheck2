import { describe, expect, it } from 'vitest';

import { computeOccurrenceWindow } from '#mocks/recurrences/occurrence/compute-occurrence-window.util.ts';
import { nextBusinessDay } from '#mocks/support/dates/next-business-day.util.ts';
import { nthBusinessDay } from '#mocks/support/dates/nth-business-day.util.ts';

const fixedDay = (day: number, shift: 'none' | 'before' | 'after' | null) => ({
  type: 'fixed_day' as const,
  day,
  businessDayNumber: null,
  toleranceDays: null,
  nonBusinessDayShift: shift,
});

describe('computeOccurrenceWindow, fixed day with a shift', () => {
  it('keeps the day when there is no shift (none, or missing)', () => {
    for (const shift of ['none', null] as const) {
      expect(computeOccurrenceWindow(fixedDay(10, shift), '2027-01')).toEqual({
        expectedOn: '2027-01-10',
        windowStartOn: '2027-01-07',
        windowEndOn: '2027-01-13',
      });
    }
  });

  it('moves Sunday 10/01/2027 to the next business day and centers the window there', () => {
    expect(computeOccurrenceWindow(fixedDay(10, 'after'), '2027-01')).toEqual({
      expectedOn: '2027-01-11',
      windowStartOn: '2027-01-08',
      windowEndOn: '2027-01-14',
    });
  });

  it('moves Sunday 10/01/2027 to the previous business day', () => {
    expect(computeOccurrenceWindow(fixedDay(10, 'before'), '2027-01')).toEqual({
      expectedOn: '2027-01-08',
      windowStartOn: '2027-01-05',
      windowEndOn: '2027-01-11',
    });
  });

  it('moves a holiday: 12/10/2026 is a Monday', () => {
    expect(computeOccurrenceWindow(fixedDay(12, 'after'), '2026-10').expectedOn).toBe('2026-10-13');
    expect(computeOccurrenceWindow(fixedDay(12, 'before'), '2026-10').expectedOn).toBe(
      '2026-10-09',
    );
  });

  it('does not move a day that is already a business day', () => {
    expect(computeOccurrenceWindow(fixedDay(11, 'after'), '2027-01').expectedOn).toBe('2027-01-11');
  });

  it('crosses into the next month: 31/10/2026 is a Saturday, 02/11 is a holiday: it goes to 03/11', () => {
    expect(computeOccurrenceWindow(fixedDay(31, 'after'), '2026-10').expectedOn).toBe('2026-11-03');
  });
});

describe('business days of the mock calendar', () => {
  it('counts the national holidays: Nov 2026 has Finados on Monday 02/11', () => {
    expect(nthBusinessDay('2026-11', 1)).toBe('2026-11-03');
    expect(nthBusinessDay('2026-11', 5)).toBe('2026-11-09');
  });

  it('skips Carnival (08 and 09/02/2027): the 5th business day is Friday 05/02, the 6th is 10/02', () => {
    expect(nthBusinessDay('2027-02', 5)).toBe('2027-02-05');
    expect(nthBusinessDay('2027-02', 6)).toBe('2027-02-10');
  });

  it('nextBusinessDay passes over a weekend glued to a holiday', () => {
    expect(nextBusinessDay('2029-04-21')).toBe('2029-04-23');
    expect(nextBusinessDay('2026-10-13')).toBe('2026-10-13');
  });
});
