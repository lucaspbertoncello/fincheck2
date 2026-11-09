import { describe, expect, it } from 'vitest';

import { computeCostliestMonth } from '#/modules/profile/application/highlight/compute-costliest-month.util.ts';
import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';

function line(
  on: string,
  cents: number,
  categoryId: string | null = null,
): ProfileSpendingReader.Line {
  return { on, cents, categoryId };
}

describe('computeCostliestMonth (BR-PRF-005)', () => {
  it('is null without spending', () => {
    expect(computeCostliestMonth([])).toBeNull();
  });

  it('sums by month and picks the biggest', () => {
    expect(
      computeCostliestMonth([
        line('2026-09-30', 10000),
        line('2026-10-01', 7000),
        line('2026-10-31', 5000),
        line('2026-11-05', 11000),
      ]),
    ).toEqual({ month: '2026-10', totalCents: 12000 });
  });

  it('breaks a tie by the most recent month', () => {
    expect(computeCostliestMonth([line('2026-09-10', 100), line('2026-10-10', 100)])).toEqual({
      month: '2026-10',
      totalCents: 100,
    });
  });

  it('is null when no month ends above zero', () => {
    expect(computeCostliestMonth([line('2026-09-10', -100)])).toBeNull();
  });
});
