import { describe, expect, it } from 'vitest';

import { computeHeatmapLevels } from '#/dashboard/spend-heatmap/compute-heatmap-levels.util.ts';

describe('computeHeatmapLevels', () => {
  it('has no ranges when nothing was spent', () => {
    expect(computeHeatmapLevels([])).toEqual([]);
    expect(computeHeatmapLevels([0, 0, 0])).toEqual([]);
  });

  it('cuts at the 25%, 50% and 75% marks of the spending days, ignoring zeros', () => {
    const totals = [0, 0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];

    expect(computeHeatmapLevels(totals)).toEqual([
      { level: 1, minCents: 1, maxCents: 2000 },
      { level: 2, minCents: 2001, maxCents: 4000 },
      { level: 3, minCents: 4001, maxCents: 6000 },
      { level: 4, minCents: 6001, maxCents: null },
    ]);
  });

  it('keeps a lumpy outlier from flattening the other days', () => {
    const ranges = computeHeatmapLevels([1000, 1500, 2000, 2500, 3000, 3500, 4000, 500_000]);

    expect(ranges[3]?.minCents).toBe(3501);
    expect(ranges[0]?.maxCents).toBe(1500);
  });

  it('leaves a level empty when many days spent the same', () => {
    const ranges = computeHeatmapLevels([1000, 1000, 1000, 1000]);

    expect(ranges[1]).toEqual({ level: 2, minCents: 1001, maxCents: 1000 });
  });

  it('works with a single spending day', () => {
    expect(computeHeatmapLevels([4200])[0]).toEqual({ level: 1, minCents: 1, maxCents: 4200 });
  });
});
