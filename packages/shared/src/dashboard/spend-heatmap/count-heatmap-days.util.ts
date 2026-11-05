// How many days a range holds, both ends included (`YYYY-MM-DD`). Negative-safe: `to` before `from`
// gives 0 or less.
export function countHeatmapDays(from: string, to: string): number {
  const toTime = (date: string) =>
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));

  return Math.round((toTime(to) - toTime(from)) / 86_400_000) + 1;
}
