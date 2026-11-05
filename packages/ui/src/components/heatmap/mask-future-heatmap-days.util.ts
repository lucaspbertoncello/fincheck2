import type { SpendHeatmapDay } from '#/components/heatmap/spend-heatmap.type.ts';

/**
 * The weeks with the days after `today` taken out (`null`, like the empty corners of the grid).
 * A year map runs to 31 December, but a day that has not come cannot be chosen or focused. Without
 * `today` every day counts.
 */
export function maskFutureHeatmapDays(
  weeks: (SpendHeatmapDay | null)[][],
  today?: string,
): (SpendHeatmapDay | null)[][] {
  if (!today) return weeks;

  return weeks.map((week) => week.map((day) => (day && day.date <= today ? day : null)));
}
