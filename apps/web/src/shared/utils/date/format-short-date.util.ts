/** `2026-10-07` -> `07/10`. Business dates are plain text: no time zone to convert. */
export function formatShortDate(businessDate: string): string {
  const [, month = '', day = ''] = businessDate.split('-');
  return `${day}/${month}`;
}
