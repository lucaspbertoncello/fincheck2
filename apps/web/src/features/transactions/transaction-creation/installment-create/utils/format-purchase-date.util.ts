/** `2026-05-12` -> `12/05/2026`. Business dates are plain text: no time zone to convert. */
export function formatPurchaseDate(businessDate: string): string {
  const [year = '', month = '', day = ''] = businessDate.split('-');
  return `${day}/${month}/${year}`;
}
