/** `2026-10-07` -> `07/10`. */
export function formatShortDate(date: string): string {
  const [, month = '', day = ''] = date.split('-');
  return `${day}/${month}`;
}
