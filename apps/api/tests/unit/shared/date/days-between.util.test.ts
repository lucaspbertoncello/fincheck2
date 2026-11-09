import { describe, expect, it } from 'vitest';

import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { dayNumber } from '#/shared/date/day-number.util.ts';
import { daysBetween } from '#/shared/date/days-between.util.ts';

const date = (value: string) => BusinessDate.of(value);

describe('daysBetween', () => {
  it('counts the days forward and backward', () => {
    expect(daysBetween(date('2026-11-05'), date('2026-11-09'))).toBe(4);
    expect(daysBetween(date('2026-11-09'), date('2026-11-05'))).toBe(-4);
    expect(daysBetween(date('2026-11-05'), date('2026-11-05'))).toBe(0);
  });

  it('crosses the end of a month and of a year, and the 29th of February', () => {
    expect(daysBetween(date('2026-12-30'), date('2027-01-02'))).toBe(3);
    expect(daysBetween(date('2028-02-28'), date('2028-03-01'))).toBe(2);
    expect(daysBetween(date('2027-02-28'), date('2027-03-01'))).toBe(1);
  });

  it('the days of the switch of summer time are not 23 or 25 hours', () => {
    expect(daysBetween(date('2018-11-03'), date('2018-11-05'))).toBe(2);
    expect(daysBetween(date('2019-02-15'), date('2019-02-17'))).toBe(2);
  });
});

describe('dayNumber', () => {
  it('is a whole number of days, one more each day', () => {
    expect(Number.isInteger(dayNumber('2026-11-09'))).toBe(true);
    expect(dayNumber('2026-11-10') - dayNumber('2026-11-09')).toBe(1);
    expect(dayNumber('1970-01-01')).toBe(0);
  });

  it('measures the same distance as daysBetween', () => {
    expect(dayNumber('2028-03-01') - dayNumber('2028-02-28')).toBe(
      daysBetween(date('2028-02-28'), date('2028-03-01')),
    );
  });
});
