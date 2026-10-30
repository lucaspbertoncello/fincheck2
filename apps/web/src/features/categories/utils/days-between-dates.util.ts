const MS_PER_DAY = 86_400_000;

function toUtcDay(date: string): number {
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
export function daysBetweenDates(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / MS_PER_DAY);
}
