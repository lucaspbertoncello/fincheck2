// The latest of some `YYYY-MM-DD` days; null when there are none.
export function latestDate(dates: readonly string[]): string | null {
  return dates.reduce<string | null>(
    (latest, date) => (latest === null || date > latest ? date : latest),
    null,
  );
}
