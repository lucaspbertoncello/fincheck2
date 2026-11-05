import { describe, expect, it } from 'vitest';

import { countHeatmapDays } from '#/dashboard/spend-heatmap/count-heatmap-days.util.ts';

describe('countHeatmapDays', () => {
  it('counts both ends, across months and leap years', () => {
    expect(countHeatmapDays('2026-10-01', '2026-10-01')).toBe(1);
    expect(countHeatmapDays('2026-10-01', '2026-10-31')).toBe(31);
    expect(countHeatmapDays('2026-01-01', '2026-12-31')).toBe(365);
    expect(countHeatmapDays('2028-01-01', '2028-12-31')).toBe(366);
  });

  it('is zero or less when the end is before the start', () => {
    expect(countHeatmapDays('2026-10-02', '2026-10-01')).toBe(0);
  });
});
