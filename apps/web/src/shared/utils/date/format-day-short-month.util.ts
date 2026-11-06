import { toUtcDate } from '#/shared/utils/date/to-utc-date.util.ts';

/** "22 out." for the short date of a transaction under a category. */
export function formatDayShortMonth(businessDate: string): string {
  const label = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toUtcDate(businessDate));
  return label.replace(' de ', ' ');
}
