import type { SpendHeatmapDay } from '#/components/heatmap/spend-heatmap.type.ts';

export type HeatmapPosition = { column: number; row: number };

/** Keys the map answers to, as the GitHub graph does. */
const MOVES: Record<string, (position: HeatmapPosition) => HeatmapPosition> = {
  ArrowLeft: ({ column, row }) => ({ column: column - 1, row }),
  ArrowRight: ({ column, row }) => ({ column: column + 1, row }),
  ArrowUp: ({ column, row }) => ({ column, row: row - 1 }),
  ArrowDown: ({ column, row }) => ({ column, row: row + 1 }),
  Home: ({ row }) => ({ column: 0, row }),
  End: ({ row }) => ({ column: Number.MAX_SAFE_INTEGER, row }),
  PageUp: ({ column }) => ({ column, row: 0 }),
  PageDown: ({ column }) => ({ column, row: 6 }),
};

export function isHeatmapKey(key: string): boolean {
  return key in MOVES;
}

/**
 * Where the focus goes for a key: arrows move one day, Home and End go to the first and last day of
 * the row (same weekday), Page Up and Down to the top and bottom of the column. The target is
 * pulled to the nearest day the map really has; no key leaves the map.
 */
export function moveHeatmapFocus(
  weeks: (SpendHeatmapDay | null)[][],
  from: HeatmapPosition,
  key: string,
): HeatmapPosition {
  const move = MOVES[key];
  if (!move) return from;
  const target = move(from);
  const column = Math.min(Math.max(target.column, 0), weeks.length - 1);
  const row = Math.min(Math.max(target.row, 0), 6);

  // Walk back toward where the focus was until a real day shows up (the first and last week are partial).
  let current = { column, row };
  while (current.column !== from.column || current.row !== from.row) {
    if (weeks[current.column]?.[current.row]) return current;
    current = {
      column: current.column + Math.sign(from.column - current.column),
      row: current.row + Math.sign(from.row - current.row),
    };
  }
  return from;
}
