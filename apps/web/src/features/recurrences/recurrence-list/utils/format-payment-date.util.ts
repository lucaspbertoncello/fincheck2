import { formatShortDate } from '#/shared/utils/date/format-short-date.util.ts';

/** "07/10", or "07/10/2025" when the day is not in the year of `today`. Business dates are plain text. */
export function formatPaymentDate(businessDate: string, today: string): string {
  const year = businessDate.slice(0, 4);

  return year === today.slice(0, 4)
    ? formatShortDate(businessDate)
    : `${formatShortDate(businessDate)}/${year}`;
}
