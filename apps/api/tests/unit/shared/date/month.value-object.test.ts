import { describe, expect, it } from 'vitest';

import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

describe('Month', () => {
  it('gives the first and the last day', () => {
    expect(Month.of('2026-11').firstDay().value).toBe('2026-11-01');
    expect(Month.of('2026-11').lastDay().value).toBe('2026-11-30');
    expect(Month.of('2026-12').lastDay().value).toBe('2026-12-31');
  });

  it('knows February, leap year or not', () => {
    expect(Month.of('2026-02').lastDay().value).toBe('2026-02-28');
    expect(Month.of('2028-02').lastDay().value).toBe('2028-02-29');
    expect(Month.of('2100-02').lastDay().value).toBe('2100-02-28');
  });

  it('goes to the previous and the next month across the year', () => {
    expect(Month.of('2026-11').previous().value).toBe('2026-10');
    expect(Month.of('2026-11').next().value).toBe('2026-12');
    expect(Month.of('2026-12').next().value).toBe('2027-01');
    expect(Month.of('2026-01').previous().value).toBe('2025-12');
  });

  it('is the month that contains a date', () => {
    expect(Month.containing(BusinessDate.of('2026-10-31')).value).toBe('2026-10');
  });

  it.each(['2026-13', '2026-00', '2026-1', '2026-11-01', 'nov/2026'])('refuses %j', (value) => {
    expect(() => Month.of(value)).toThrow(RangeError);
  });

  it('exposes the parts and compares', () => {
    const month = Month.of('2026-11');

    expect([month.year, month.monthNumber]).toEqual([2026, 11]);
    expect(month.toString()).toBe('2026-11');
    expect(month.equals(Month.of('2026-11'))).toBe(true);
    expect(month.equals(Month.of('2026-10'))).toBe(false);
  });
});
