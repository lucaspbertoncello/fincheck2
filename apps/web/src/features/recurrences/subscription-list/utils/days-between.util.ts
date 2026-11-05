function toUtcDay(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);

  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(toUtcDay(to) - toUtcDay(from));
}
