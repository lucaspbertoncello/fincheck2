import { MONTH_SHORT_NAMES } from '#/shared/constants/date/month-names.constant.ts';

/**
 * "12 mar" from a business date (`YYYY-MM-DD`); "12 mar 2025" when the year is not the current one,
 * because the Pix covers the whole history.
 */
export function formatHighlightDay(date: string, today: string): string {
  const month = MONTH_SHORT_NAMES[Number(date.slice(5, 7)) - 1] ?? '';
  const day = `${Number(date.slice(8, 10))} ${month}`;

  return date.slice(0, 4) === today.slice(0, 4) ? day : `${day} ${date.slice(0, 4)}`;
}
