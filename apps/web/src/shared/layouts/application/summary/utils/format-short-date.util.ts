/** `2026-10-31` -> `31/10`. */
export function formatShortDate(businessDate: string): string {
  const [, month = '', day = ''] = businessDate.split('-');
  return `${day}/${month}`;
}
