import type { SpendHeatmapLevel } from '#/components/heatmap/spend-heatmap.type.ts';

/** The API sends the level as a plain integer: keep it inside the five fills. */
export function clampHeatmapLevel(level: number): SpendHeatmapLevel {
  if (level <= 0) return 0;
  if (level >= 4) return 4;
  return Math.round(level) as SpendHeatmapLevel;
}
