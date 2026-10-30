/** `2026-10-25` -> `25/10`. */
export function formatDayMonth(date: string): string {
  const [, month = '', day = ''] = date.split('-');
  return `${day}/${month}`;
}
