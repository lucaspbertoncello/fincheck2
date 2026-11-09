import { describe, expect, it } from 'vitest';

import { computeCostliestWeekday } from '#/modules/profile/application/highlight/compute-costliest-weekday.util.ts';
import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

function line(
  on: string,
  cents: number,
  categoryId: string | null = null,
): ProfileSpendingReader.Line {
  return { on, cents, categoryId };
}

const date = (value: string) => BusinessDate.of(value);

describe('computeCostliestWeekday (BR-PRF-005)', () => {
  // 2026-11-01 is a Sunday; the period below is exactly 14 days, two of each weekday.
  const period = { from: date('2026-11-01'), to: date('2026-11-14') };

  it('is null without spending', () => {
    expect(computeCostliestWeekday([], period)).toBeNull();
  });

  it('averages per occurrence of the weekday, counting the days with no spending', () => {
    // Tuesday 03/11 spent 10000 and Tuesday 10/11 spent nothing: average 5000. Friday 06/11
    // spent 6000 once: average 3000.
    expect(
      computeCostliestWeekday([line('2026-11-03', 10000), line('2026-11-06', 6000)], period),
    ).toEqual({ weekday: 2, averageCents: 5000 });
  });

  it('adds the lines of the same day and of the same weekday', () => {
    expect(
      computeCostliestWeekday(
        [line('2026-11-07', 1000), line('2026-11-07', 1000), line('2026-11-14', 2000)],
        period,
      ),
    ).toEqual({ weekday: 6, averageCents: 2000 });
  });

  it('counts 0 as Sunday', () => {
    expect(computeCostliestWeekday([line('2026-11-01', 400)], period)).toEqual({
      weekday: 0,
      averageCents: 200,
    });
  });

  it('rounds the average to the cent', () => {
    expect(computeCostliestWeekday([line('2026-11-01', 401)], period)).toEqual({
      weekday: 0,
      averageCents: 201,
    });
  });

  it('is null when nothing averages a cent', () => {
    // 21 days, three of each weekday: one cent over three days rounds to zero.
    expect(
      computeCostliestWeekday([line('2026-11-01', 1)], {
        from: date('2026-11-01'),
        to: date('2026-11-21'),
      }),
    ).toBeNull();
  });

  it('counts a weekday that occurs one more time in the period', () => {
    // 15 days: Sunday 01/11, 08/11 and 15/11 happen three times, the others twice.
    expect(
      computeCostliestWeekday([line('2026-11-01', 3000)], {
        from: date('2026-11-01'),
        to: date('2026-11-15'),
      }),
    ).toEqual({ weekday: 0, averageCents: 1000 });
  });
});
