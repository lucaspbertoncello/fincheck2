import { describe, expect, it } from 'vitest';

import { computeTopCategory } from '#/modules/profile/application/highlight/compute-top-category.util.ts';
import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';

function line(
  on: string,
  cents: number,
  categoryId: string | null = null,
): ProfileSpendingReader.Line {
  return { on, cents, categoryId };
}

describe('computeTopCategory (BR-PRF-005)', () => {
  it('is null without spending', () => {
    expect(computeTopCategory([])).toBeNull();
  });

  it('picks the category with the most spending and its share of everything spent', () => {
    expect(
      computeTopCategory([
        line('2026-10-01', 30000, 'food'),
        line('2026-10-02', 20000, 'food'),
        line('2026-10-03', 25000, 'transport'),
        line('2026-10-04', 25000, null),
      ]),
    ).toEqual({ categoryId: 'food', totalCents: 50000, sharePercent: 50 });
  });

  it('rounds the share to one decimal', () => {
    expect(computeTopCategory([line('2026-10-01', 1, 'a'), line('2026-10-02', 2, 'b')])).toEqual({
      categoryId: 'b',
      totalCents: 2,
      sharePercent: 66.7,
    });
  });

  it('takes the refunds off the category', () => {
    expect(
      computeTopCategory([
        line('2026-10-01', 10000, 'food'),
        line('2026-10-02', -9000, 'food'),
        line('2026-10-03', 5000, 'transport'),
      ]),
    ).toMatchObject({ categoryId: 'transport', totalCents: 5000 });
  });

  it('does not elect the spending with no category', () => {
    expect(
      computeTopCategory([line('2026-10-01', 90000, null), line('2026-10-02', 100, 'a')]),
    ).toEqual({
      categoryId: 'a',
      totalCents: 100,
      sharePercent: 0.1,
    });
  });

  it('is null when only the uncategorized spent', () => {
    expect(computeTopCategory([line('2026-10-01', 90000, null)])).toBeNull();
  });

  it('is null when the refunds are bigger than the spending', () => {
    expect(computeTopCategory([line('2026-10-01', -500, 'a')])).toBeNull();
  });

  it('breaks a tie by the smaller category id', () => {
    expect(
      computeTopCategory([line('2026-10-01', 100, 'b'), line('2026-10-02', 100, 'a')]),
    ).toMatchObject({ categoryId: 'a' });
  });
});
