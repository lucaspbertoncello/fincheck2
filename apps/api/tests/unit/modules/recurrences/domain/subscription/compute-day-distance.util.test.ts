import { describe, expect, it } from 'vitest';

import { computeDayDistance } from '#/modules/recurrences/domain/subscription/compute-day-distance.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

describe('computeDayDistance', () => {
  it('is the gap between the days on the circle of the month of the newer charge', () => {
    const day = (value: string) => BusinessDate.of(value);

    expect(computeDayDistance(day('2026-10-12'), day('2026-09-12'))).toBe(0);
    expect(computeDayDistance(day('2026-10-12'), day('2026-09-07'))).toBe(5);
    expect(computeDayDistance(day('2026-10-02'), day('2026-09-30'))).toBe(3);
    expect(computeDayDistance(day('2026-10-30'), day('2026-10-01'))).toBe(2);
    // The 31st of August in a month of 30 days is the 30th.
    expect(computeDayDistance(day('2026-09-30'), day('2026-08-31'))).toBe(0);
    // February of 28 days: the 31st is the 28th.
    expect(computeDayDistance(day('2026-02-28'), day('2026-01-31'))).toBe(0);
  });
});
