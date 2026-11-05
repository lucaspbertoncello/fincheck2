// The weekday of a business date (`YYYY-MM-DD`): 0 is Sunday, 6 is Saturday.
export function weekdayOf(date: string): number {
  return new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))),
  ).getUTCDay();
}
