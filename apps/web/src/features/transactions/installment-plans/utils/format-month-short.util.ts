const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** `2026-05` -> `mai/26`. */
export function formatMonthShort(monthKey: string): string {
  const [year = '', month = '1'] = monthKey.split('-');
  return `${MONTHS[Number(month) - 1] ?? ''}/${year.slice(2)}`;
}
