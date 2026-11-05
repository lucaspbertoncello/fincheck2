import { HEATMAP_MOVES } from '#/components/heatmap/heatmap-moves.constant.ts';

export function isHeatmapKey(key: string): boolean {
  return key in HEATMAP_MOVES;
}
