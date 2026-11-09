import { computeHeatmapLevels } from '@fincheck/shared/dashboard/spend-heatmap/compute-heatmap-levels.util.ts';
import { heatmapLevelOf } from '@fincheck/shared/dashboard/spend-heatmap/heatmap-level-of.util.ts';
import type { SpendHeatmap } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.type.ts';

import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The map of spending (BR-PRF-003): one item per day from `fromOn` to `untilOn`, no gaps, with what
// was spent that day by competence. `lines` are the spending lines (a refund is negative). A day
// never goes below zero: a refund bigger than the spending of its day does not paint it green. The
// levels come from the quantiles of the days that spent (`computeHeatmapLevels`, shared with the
// front), and the peak is the first day with the most spending; null when nothing was spent.
export function buildSpendHeatmap(input: {
  fromOn: BusinessDate;
  untilOn: BusinessDate;
  lines: { on: string; cents: number }[];
}): SpendHeatmap.Dto {
  const perDay = new Map<string, number>();
  for (const line of input.lines) perDay.set(line.on, (perDay.get(line.on) ?? 0) + line.cents);

  const dates: string[] = [];
  for (let day = input.fromOn; !input.untilOn.isBefore(day); day = day.addDays(1)) {
    dates.push(day.value);
  }
  const totals = dates.map((date) => Math.max(0, perDay.get(date) ?? 0));
  const levels = computeHeatmapLevels(totals);
  const days = dates.map((date, index) => {
    const totalCents = totals[index] ?? 0;

    return { date, totalCents, level: heatmapLevelOf(totalCents, levels) };
  });
  const peak = days.reduce<SpendHeatmap.Day | null>(
    (best, day) => (day.totalCents > (best?.totalCents ?? 0) ? day : best),
    null,
  );

  return {
    fromOn: input.fromOn.value,
    untilOn: input.untilOn.value,
    totalCents: totals.reduce((total, cents) => total + cents, 0),
    spendingDays: totals.filter((total) => total > 0).length,
    peak: peak ? { date: peak.date, totalCents: peak.totalCents } : null,
    levels,
    days,
  };
}
