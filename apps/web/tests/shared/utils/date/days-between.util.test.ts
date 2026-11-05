import { describe, expect, it } from 'vitest';

import { daysBetween } from '#/shared/utils/date/days-between.util.ts';

describe('daysBetween', () => {
  it('counts whole days, across months and years', () => {
    expect(daysBetween('2026-10-22', '2026-10-22')).toBe(0);
    expect(daysBetween('2026-10-22', '2026-11-01')).toBe(10);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('is negative when the end is earlier', () => {
    expect(daysBetween('2026-10-22', '2026-10-19')).toBe(-3);
  });
});
