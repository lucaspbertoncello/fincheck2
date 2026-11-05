/** The transactions of one day: `/transactions?month=2026-10&day=2026-10-14`. */
export function buildHeatmapDayHref(date: string): string {
  return `/transactions?month=${date.slice(0, 7)}&day=${date}`;
}
