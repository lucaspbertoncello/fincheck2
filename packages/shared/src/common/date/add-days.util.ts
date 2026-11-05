// Adds days to a business date (`YYYY-MM-DD`); negative goes back.
export function addDays(date: string, days: number): string {
  const moved = new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)) + days,
    ),
  );

  return moved.toISOString().slice(0, 10);
}
