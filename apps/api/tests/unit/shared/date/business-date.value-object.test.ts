import { describe, expect, it } from 'vitest';

import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

describe('BusinessDate', () => {
  it('keeps the text and exposes the parts', () => {
    const date = BusinessDate.of('2026-11-06');

    expect(date.value).toBe('2026-11-06');
    expect(date.toString()).toBe('2026-11-06');
    expect([date.year, date.monthNumber, date.day]).toEqual([2026, 11, 6]);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-1-1', '06/11/2026', '2026-11-06T00:00:00Z', ''])(
    'refuses %j',
    (value) => {
      expect(() => BusinessDate.of(value)).toThrow(RangeError);
    },
  );

  it('knows the weekday without the time zone getting in the way', () => {
    expect(BusinessDate.of('2026-11-06').weekday()).toBe(5); // Friday
    expect(BusinessDate.of('2026-11-08').weekday()).toBe(0); // Sunday
    expect(BusinessDate.of('2026-11-07').weekday()).toBe(6); // Saturday
  });

  describe('addDays', () => {
    it('crosses months and years, forward and back', () => {
      expect(BusinessDate.of('2026-12-31').addDays(1).value).toBe('2027-01-01');
      expect(BusinessDate.of('2026-03-01').addDays(-1).value).toBe('2026-02-28');
      expect(BusinessDate.of('2028-02-28').addDays(1).value).toBe('2028-02-29');
    });
  });

  describe('addMonths', () => {
    it('holds the day at the end of a shorter month', () => {
      expect(BusinessDate.of('2026-01-31').addMonths(1).value).toBe('2026-02-28');
      expect(BusinessDate.of('2028-01-31').addMonths(1).value).toBe('2028-02-29');
      expect(BusinessDate.of('2026-03-31').addMonths(1).value).toBe('2026-04-30');
    });

    it('keeps the day when the month has it', () => {
      expect(BusinessDate.of('2026-10-15').addMonths(1).value).toBe('2026-11-15');
    });

    it('crosses the year and goes back', () => {
      expect(BusinessDate.of('2026-11-30').addMonths(3).value).toBe('2027-02-28');
      expect(BusinessDate.of('2026-01-15').addMonths(-2).value).toBe('2025-11-15');
      expect(BusinessDate.of('2026-03-31').addMonths(-1).value).toBe('2026-02-28');
      expect(BusinessDate.of('2026-06-10').addMonths(12).value).toBe('2027-06-10');
    });
  });

  it('compares dates', () => {
    const a = BusinessDate.of('2026-11-05');
    const b = BusinessDate.of('2026-11-06');

    expect(a.isBefore(b)).toBe(true);
    expect(b.isBefore(a)).toBe(false);
    expect(a.equals(BusinessDate.of('2026-11-05'))).toBe(true);
  });
});
