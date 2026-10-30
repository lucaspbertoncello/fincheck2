import type { SpendHeatmap } from './spend-heatmap.type.ts';

// The level (0 to 4) of a day's total, given the ranges of `computeHeatmapLevels`.
export function heatmapLevelOf(
  totalCents: number,
  levels: SpendHeatmap.LevelRange[],
): SpendHeatmap.Level {
  if (totalCents <= 0 || levels.length === 0) return 0;

  const range = levels.find((item) => item.maxCents === null || totalCents <= item.maxCents);

  return range ? range.level : 4;
}
