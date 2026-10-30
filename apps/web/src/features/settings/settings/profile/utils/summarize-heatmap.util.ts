import type { SpendHeatmap } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.type.ts';

export type HeatmapSummary = {
  peak: SpendHeatmap.Dto['peak'];
  /** Average per day over the whole period, days without spending included. */
  averageCents: number;
  daysWithoutSpending: number;
  spendingDays: number;
};

/** The words next to the map: the biggest day, the daily average and the days with nothing spent. */
export function summarizeHeatmap(data: SpendHeatmap.Dto): HeatmapSummary {
  const dayCount = data.days.length;
  return {
    peak: data.peak,
    averageCents: dayCount === 0 ? 0 : Math.round(data.totalCents / dayCount),
    daysWithoutSpending: dayCount - data.spendingDays,
    spendingDays: data.spendingDays,
  };
}
