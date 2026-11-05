import { describe, expect, it } from 'vitest';

import { resolveSpendMapRange } from '#/features/profile/profile/utils/resolve-spend-map-range.util.ts';

describe('resolveSpendMapRange', () => {
  it('gives the 1st to the last day of the month, leap February and 30-day months included', () => {
    expect(resolveSpendMapRange({ mode: 'month', month: '2026-10' })).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(resolveSpendMapRange({ mode: 'month', month: '2026-11' }).to).toBe('2026-11-30');
    expect(resolveSpendMapRange({ mode: 'month', month: '2026-02' }).to).toBe('2026-02-28');
    expect(resolveSpendMapRange({ mode: 'month', month: '2028-02' }).to).toBe('2028-02-29');
  });

  it('gives January to December of the year of the month, even before the year ends', () => {
    expect(resolveSpendMapRange({ mode: 'year', month: '2026-10' })).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(resolveSpendMapRange({ mode: 'year', month: '2025-03' })).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
  });
});
