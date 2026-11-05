const MONTH_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

/**
 * "12 mar" from a business date (`YYYY-MM-DD`); "12 mar 2025" when the year is not the current one,
 * because the Pix covers the whole history.
 */
export function formatHighlightDay(date: string, today: string): string {
  const month = MONTH_SHORT[Number(date.slice(5, 7)) - 1] ?? '';
  const day = `${Number(date.slice(8, 10))} ${month}`;

  return date.slice(0, 4) === today.slice(0, 4) ? day : `${day} ${date.slice(0, 4)}`;
}
