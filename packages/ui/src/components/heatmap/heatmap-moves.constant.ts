import type { HeatmapPosition } from '#/components/heatmap/heatmap-position.type.ts';

/** Keys the map answers to, as the GitHub graph does. */
export const HEATMAP_MOVES: Record<string, (position: HeatmapPosition) => HeatmapPosition> = {
  ArrowLeft: ({ column, row }) => ({ column: column - 1, row }),
  ArrowRight: ({ column, row }) => ({ column: column + 1, row }),
  ArrowUp: ({ column, row }) => ({ column, row: row - 1 }),
  ArrowDown: ({ column, row }) => ({ column, row: row + 1 }),
  Home: ({ row }) => ({ column: 0, row }),
  End: ({ row }) => ({ column: Number.MAX_SAFE_INTEGER, row }),
  PageUp: ({ column }) => ({ column, row: 0 }),
  PageDown: ({ column }) => ({ column, row: 6 }),
};
