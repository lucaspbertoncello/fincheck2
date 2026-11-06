import { toUtcDate } from '#/shared/utils/date/to-utc-date.util.ts';
import { capitalize } from '#/shared/utils/text/capitalize.util.ts';

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "Hoje", "Ontem" or the weekday ("Terça"), and the date ("20 de outubro") of a business date. */
export function formatDayHeading(
  businessDate: string,
  today: string,
): { title: string; dateLabel: string } {
  const date = toUtcDate(businessDate);
  const daysAgo = Math.round((toUtcDate(today).getTime() - date.getTime()) / 86_400_000);
  const weekday = capitalize(weekdayFormat.format(date).replace(/-feira$/, ''));
  const title = daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : weekday;

  return { title, dateLabel: dateFormat.format(date) };
}
