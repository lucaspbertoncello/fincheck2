/** "18/10" from `2026-10-18`: the day and month, as the preview lists them. */
export function formatShortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}
