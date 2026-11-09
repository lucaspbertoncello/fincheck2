import { describe, expect, it } from 'vitest';

import { businessTimeOfInstant } from '#/shared/date/business-time-of-instant.util.ts';
import { instantOfBusinessTime } from '#/shared/date/instant-of-business-time.util.ts';

describe('businessTimeOfInstant', () => {
  it('gives the wall clock of São Paulo', () => {
    expect(businessTimeOfInstant('2026-11-08T15:04:05.000Z')).toEqual({
      year: 2026,
      month: 11,
      day: 8,
      hour: 12,
      minute: 4,
      second: 5,
    });
  });

  it('is still the day before at 02:59 UTC, and shows midnight as 0 (not 24)', () => {
    expect(businessTimeOfInstant('2026-11-09T02:59:59.000Z')).toMatchObject({ day: 8, hour: 23 });
    expect(businessTimeOfInstant('2026-11-09T03:00:00.000Z')).toMatchObject({ day: 9, hour: 0 });
  });
});

describe('instantOfBusinessTime', () => {
  it('turns the wall clock of São Paulo into UTC', () => {
    expect(
      instantOfBusinessTime({ year: 2026, month: 11, day: 8, hour: 3, minute: 0, second: 0 }),
    ).toBe('2026-11-08T06:00:00.000Z');
  });

  it('is the inverse of businessTimeOfInstant across a year', () => {
    for (let day = 0; day < 366; day += 1) {
      const instant = new Date(Date.UTC(2026, 0, 1, 7, 13, 21) + day * 86_400_000).toISOString();

      expect(instantOfBusinessTime(businessTimeOfInstant(instant))).toBe(instant);
    }
  });

  it('follows the zone when it had summer time (January 2018 was UTC-2)', () => {
    expect(
      instantOfBusinessTime({ year: 2018, month: 1, day: 15, hour: 3, minute: 0, second: 0 }),
    ).toBe('2018-01-15T05:00:00.000Z');
  });
});
