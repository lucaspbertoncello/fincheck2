import { HEATMAP_QUANTILES } from './spend-heatmap.constant.ts';
import type { SpendHeatmap } from './spend-heatmap.type.ts';

// The four ranges of the intensity levels, from the totals of the days (zeros are ignored).
// Quantiles, not a linear scale: spending is lumpy (one rent day would turn every other day into
// level 1), so the cut points are the 25%, 50% and 75% marks of the days that had spending, by
// nearest rank. No spending day, no ranges.
export function computeHeatmapLevels(dayTotalsCents: number[]): SpendHeatmap.LevelRange[] {
  const spent = dayTotalsCents.filter((total) => total > 0).sort((a, b) => a - b);

  if (spent.length === 0) return [];

  const [first, second, third] = HEATMAP_QUANTILES.map((share) => {
    const rank = Math.max(1, Math.ceil(share * spent.length));

    return spent[rank - 1] ?? 0;
  }) as [number, number, number];

  return [
    { level: 1, minCents: 1, maxCents: first },
    { level: 2, minCents: first + 1, maxCents: second },
    { level: 3, minCents: second + 1, maxCents: third },
    { level: 4, minCents: third + 1, maxCents: null },
  ];
}
