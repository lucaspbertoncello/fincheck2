import { HEATMAP_MONTHS_SHORT } from '#/components/heatmap/heatmap-level.constant.ts';
import type { SpendHeatmapDay, SpendHeatmapGrid } from '#/components/heatmap/spend-heatmap.type.ts';

function weekdayOf(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Lays the days out like the GitHub graph: one column per week (Sunday on top), the first and the
 * last column may be incomplete. The month label sits over the column that holds the 1st.
 */
export function buildHeatmapGrid(days: SpendHeatmapDay[]): SpendHeatmapGrid {
  const weeks: (SpendHeatmapDay | null)[][] = [];
  const monthLabels: SpendHeatmapGrid['monthLabels'] = [];

  for (const day of days) {
    const weekday = weekdayOf(day.date);
    let week = weeks[weeks.length - 1];
    if (!week || weekday === 0) {
      week = Array.from({ length: 7 }, () => null);
      weeks.push(week);
    }
    week[weekday] = day;
    if (day.date.endsWith('-01')) {
      const month = Number(day.date.slice(5, 7));
      monthLabels.push({ column: weeks.length - 1, label: HEATMAP_MONTHS_SHORT[month - 1] ?? '' });
    }
  }

  // A label in the last column would run out of the map; the month is still in the summary.
  return {
    weeks,
    monthLabels: monthLabels.filter((label) => label.column <= weeks.length - 2),
  };
}
