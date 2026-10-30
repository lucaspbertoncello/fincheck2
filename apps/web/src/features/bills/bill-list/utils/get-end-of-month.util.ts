/** `2026-10` -> `2026-10-31`. */
export function getEndOfMonth(month: string): string {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}
