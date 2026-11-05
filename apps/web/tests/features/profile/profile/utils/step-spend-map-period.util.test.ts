import { describe, expect, it } from 'vitest';

import { isSpendMapPeriodCurrent } from '#/features/profile/profile/utils/is-spend-map-period-current.util.ts';
import { stepSpendMapPeriod } from '#/features/profile/profile/utils/step-spend-map-period.util.ts';

describe('stepSpendMapPeriod', () => {
  it('moves a month in the month view, across the year', () => {
    expect(stepSpendMapPeriod({ mode: 'month', month: '2026-01' }, -1, '2026-10')).toEqual({
      mode: 'month',
      month: '2025-12',
    });
    expect(stepSpendMapPeriod({ mode: 'month', month: '2026-08' }, 1, '2026-10').month).toBe(
      '2026-09',
    );
  });

  it('moves a year in the year view, keeping the month', () => {
    expect(stepSpendMapPeriod({ mode: 'year', month: '2026-10' }, -1, '2026-10').month).toBe(
      '2025-10',
    );
    expect(stepSpendMapPeriod({ mode: 'year', month: '2024-03' }, 1, '2026-10').month).toBe(
      '2025-03',
    );
  });

  it('never goes past the current month', () => {
    expect(stepSpendMapPeriod({ mode: 'month', month: '2026-10' }, 1, '2026-10').month).toBe(
      '2026-10',
    );
    expect(stepSpendMapPeriod({ mode: 'year', month: '2026-03' }, 1, '2026-10').month).toBe(
      '2026-10',
    );
  });
});

describe('isSpendMapPeriodCurrent', () => {
  it('is the current month in the month view and the current year in the year view', () => {
    expect(isSpendMapPeriodCurrent({ mode: 'month', month: '2026-10' }, '2026-10')).toBe(true);
    expect(isSpendMapPeriodCurrent({ mode: 'month', month: '2026-09' }, '2026-10')).toBe(false);
    expect(isSpendMapPeriodCurrent({ mode: 'year', month: '2026-03' }, '2026-10')).toBe(true);
    expect(isSpendMapPeriodCurrent({ mode: 'year', month: '2025-12' }, '2026-10')).toBe(false);
  });
});
