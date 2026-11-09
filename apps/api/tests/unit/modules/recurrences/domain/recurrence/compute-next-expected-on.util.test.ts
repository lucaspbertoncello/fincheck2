import { describe, expect, it } from 'vitest';

import { computeNextExpectedOn } from '#/modules/recurrences/domain/recurrence/compute-next-expected-on.util.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const calendar = new BusinessCalendar();

function nextOf(rule: DateRule.Input, today: string, startsMonth = '2026-01') {
  return (
    computeNextExpectedOn(
      DateRule.create(rule),
      Month.of(startsMonth),
      BusinessDate.of(today),
      calendar,
    )?.value ?? null
  );
}

describe('computeNextExpectedOn (BR-PRF-002, nextExpectedOn)', () => {
  it('takes the day of the current month when it is still ahead', () => {
    expect(nextOf({ type: 'fixed_day', day: 25 }, '2026-11-08')).toBe('2026-11-25');
  });

  it('takes today itself', () => {
    expect(nextOf({ type: 'fixed_day', day: 8 }, '2026-11-08')).toBe('2026-11-08');
  });

  it('goes to the next month when the day has passed', () => {
    expect(nextOf({ type: 'fixed_day', day: 5 }, '2026-11-08')).toBe('2026-12-05');
  });

  it('crosses the year', () => {
    expect(nextOf({ type: 'fixed_day', day: 5 }, '2026-12-20')).toBe('2027-01-05');
  });

  it('uses the same expected day as the occurrence (a fixed day moved to the next business day)', () => {
    // 15/11/2026 is a Sunday (and a holiday): shifted after, it is Monday 16/11.
    expect(nextOf({ type: 'fixed_day', day: 15, nonBusinessDayShift: 'after' }, '2026-11-08')).toBe(
      '2026-11-16',
    );
  });

  it('counts the nth business day of the month', () => {
    // The 5th business day of November 2026 is 09/11; of December, 07/12.
    expect(nextOf({ type: 'business_day', businessDayNumber: 5 }, '2026-11-08')).toBe('2026-11-09');
    expect(nextOf({ type: 'business_day', businessDayNumber: 5 }, '2026-11-10')).toBe('2026-12-07');
  });

  it('uses the likely day of "around day X"', () => {
    expect(nextOf({ type: 'around_day', day: 25, toleranceDays: 2 }, '2026-11-08')).toBe(
      '2026-11-25',
    );
  });

  it('holds a day 31 at the end of a short month', () => {
    expect(nextOf({ type: 'fixed_day', day: 31 }, '2026-02-10')).toBe('2026-02-28');
  });

  it('is null for "any day" with no likely day', () => {
    expect(nextOf({ type: 'any_day' }, '2026-11-08')).toBeNull();
  });

  it('is the likely day of "any day" when there is one', () => {
    expect(nextOf({ type: 'any_day', day: 20 }, '2026-11-08')).toBe('2026-11-20');
  });

  it('waits for the first month of a recurrence that starts later', () => {
    expect(nextOf({ type: 'fixed_day', day: 25 }, '2026-11-08', '2027-01')).toBe('2027-01-25');
  });

  it('looks past a month whose moved day falls before today', () => {
    // Day 1 shifted back: 01/11/2026 is a Sunday, so it moves to Friday 30/10 (before today, the
    // 31st, when it is asked from October); the 1st of December is a Tuesday.
    expect(nextOf({ type: 'fixed_day', day: 1, nonBusinessDayShift: 'before' }, '2026-10-31')).toBe(
      '2026-12-01',
    );
  });
});
