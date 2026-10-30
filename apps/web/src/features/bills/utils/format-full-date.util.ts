/** `2026-10-25` -> `25/10/2026`. */
export function formatFullDate(date: string): string {
  const [year = '', month = '', day = ''] = date.split('-');
  return `${day}/${month}/${year}`;
}
