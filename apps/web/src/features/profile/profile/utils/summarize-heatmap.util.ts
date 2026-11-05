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

/**
 * The words next to the map: the biggest day, the daily average and the days with nothing spent.
 * With `today`, only the days up to it count (the rest of a year that has not ended has not
 * happened: it is not "days without spending" and does not pull the average down), and the total,
 * the days with spending and the biggest day are read from those days.
 */
export function summarizeHeatmap(data: SpendHeatmap.Dto, today?: string): HeatmapSummary {
  if (!today) {
    const dayCount = data.days.length;
    return {
      peak: data.peak,
      averageCents: dayCount === 0 ? 0 : Math.round(data.totalCents / dayCount),
      daysWithoutSpending: dayCount - data.spendingDays,
      spendingDays: data.spendingDays,
      dayCount,
    };
  }

  const elapsed = data.days.filter((day) => day.date <= today);
  const spent = elapsed.filter((day) => day.totalCents > 0);
  const totalCents = spent.reduce((sum, day) => sum + day.totalCents, 0);
  const peak = spent.reduce<(typeof spent)[number] | null>(
    (best, day) => (day.totalCents > (best?.totalCents ?? 0) ? day : best),
    null,
  );

  return {
    peak: peak ? { date: peak.date, totalCents: peak.totalCents } : null,
    averageCents: elapsed.length === 0 ? 0 : Math.round(totalCents / elapsed.length),
    daysWithoutSpending: elapsed.length - spent.length,
    spendingDays: spent.length,
    dayCount: elapsed.length,
  };
}
