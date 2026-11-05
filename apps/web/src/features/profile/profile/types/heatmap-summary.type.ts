import type { SpendHeatmap } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.type.ts';

export type HeatmapSummary = {
  peak: SpendHeatmap.Dto['peak'];
  /** Average per day over the whole period, days without spending included. */
  averageCents: number;
  daysWithoutSpending: number;
  spendingDays: number;
  /** The days the figures cover: the period up to today. */
  dayCount: number;
};
