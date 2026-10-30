/** "06/11" from a business date (`YYYY-MM-DD`). */
export function formatShortDay(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}
