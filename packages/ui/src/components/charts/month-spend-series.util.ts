import type { ChartPoint } from '#/components/charts/chart-point.type.ts';
import type { MonthSpendRow } from '#/components/charts/month-spend-row.type.ts';

type BuildRowsInput = {
  current: readonly ChartPoint[];
  previous: readonly ChartPoint[];
  /** Day of the month of "today": the current line stops here. */
  today: number;
  daysInMonth: number;
};

/** Value of a cumulative series on `day`: the last point at or before it, or 0 before the first. */
function valueOnDay(sorted: readonly ChartPoint[], day: number): number {
  let value = 0;
  for (const point of sorted) {
    if (point.day > day) break;
    value = point.cents;
  }
  return value;
}

/** One row per day of the month, ready for the chart. Missing days carry the last value forward. */
export function buildMonthSpendRows({
  current,
  previous,
  today,
  daysInMonth,
}: BuildRowsInput): MonthSpendRow[] {
  const byDay = (a: ChartPoint, b: ChartPoint) => a.day - b.day;
  const currentSorted = [...current].sort(byDay);
  const previousSorted = [...previous].sort(byDay);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return {
      day,
      current: day <= today ? valueOnDay(currentSorted, day) : null,
      previous: valueOnDay(previousSorted, day),
    };
  });
}
