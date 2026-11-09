import { describe, expect, it } from 'vitest';

import { computeLongestNoSpendStreak } from '#/modules/profile/application/highlight/compute-longest-no-spend-streak.util.ts';
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

describe('computeLongestNoSpendStreak (BR-PRF-005)', () => {
  it('is null without spending', () => {
    expect(computeLongestNoSpendStreak([], date('2026-11-08'))).toBeNull();
  });

  it('finds the longest run between two spent days', () => {
    expect(
      computeLongestNoSpendStreak(
        [
          line('2026-10-01', 100),
          line('2026-10-04', 100), // 2 days (02, 03)
          line('2026-10-10', 100), // 5 days (05 to 09)
          line('2026-10-12', 100), // 1 day (11)
        ],
        date('2026-10-12'),
      ),
    ).toEqual({ days: 5, from: '2026-10-05', to: '2026-10-09' });
  });

  it('counts the run that goes up to today', () => {
    expect(
      computeLongestNoSpendStreak(
        [line('2026-10-01', 100), line('2026-10-03', 100)],
        date('2026-10-20'),
      ),
    ).toEqual({ days: 17, from: '2026-10-04', to: '2026-10-20' });
  });

  it('starts at the first day with spending, not before it', () => {
    expect(computeLongestNoSpendStreak([line('2026-10-10', 100)], date('2026-10-12'))).toEqual({
      days: 2,
      from: '2026-10-11',
      to: '2026-10-12',
    });
  });

  it('is null when every day since the first was spent', () => {
    expect(
      computeLongestNoSpendStreak(
        [line('2026-10-10', 100), line('2026-10-11', 100), line('2026-10-12', 100)],
        date('2026-10-12'),
      ),
    ).toBeNull();
  });

  it('sums the lines of a day: a refund that cancels the purchase leaves a day with no spending', () => {
    expect(
      computeLongestNoSpendStreak(
        [
          line('2026-10-01', 100),
          line('2026-10-02', 500),
          line('2026-10-02', -500),
          line('2026-10-04', 100),
        ],
        date('2026-10-04'),
      ),
    ).toEqual({ days: 2, from: '2026-10-02', to: '2026-10-03' });
  });

  it('breaks a tie by the most recent run', () => {
    expect(
      computeLongestNoSpendStreak(
        [line('2026-10-01', 100), line('2026-10-04', 100), line('2026-10-07', 100)],
        date('2026-10-07'),
      ),
    ).toEqual({ days: 2, from: '2026-10-05', to: '2026-10-06' });
  });

  it('crosses the end of a month', () => {
    expect(
      computeLongestNoSpendStreak(
        [line('2026-10-30', 100), line('2026-11-03', 100)],
        date('2026-11-03'),
      ),
    ).toEqual({ days: 3, from: '2026-10-31', to: '2026-11-02' });
  });
});
