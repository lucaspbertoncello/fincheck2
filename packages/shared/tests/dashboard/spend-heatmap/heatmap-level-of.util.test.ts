import { describe, expect, it } from 'vitest';

import { computeHeatmapLevels } from '#/dashboard/spend-heatmap/compute-heatmap-levels.util.ts';
import { heatmapLevelOf } from '#/dashboard/spend-heatmap/heatmap-level-of.util.ts';

const levels = computeHeatmapLevels([1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000]);

describe('heatmapLevelOf', () => {
  it('is level 0 for no spending, and when there are no ranges', () => {
    expect(heatmapLevelOf(0, levels)).toBe(0);
    expect(heatmapLevelOf(-500, levels)).toBe(0);
    expect(heatmapLevelOf(900, [])).toBe(0);
  });

  it('puts a total in the range that holds it', () => {
    expect(heatmapLevelOf(1, levels)).toBe(1);
    expect(heatmapLevelOf(2000, levels)).toBe(1);
    expect(heatmapLevelOf(2001, levels)).toBe(2);
    expect(heatmapLevelOf(6000, levels)).toBe(3);
    expect(heatmapLevelOf(6001, levels)).toBe(4);
    expect(heatmapLevelOf(9_999_999, levels)).toBe(4);
  });

  it('skips an empty level', () => {
    const tied = computeHeatmapLevels([1000, 1000, 1000, 1000]);

    expect(heatmapLevelOf(1000, tied)).toBe(1);
    expect(heatmapLevelOf(1001, tied)).toBe(4);
  });
});
