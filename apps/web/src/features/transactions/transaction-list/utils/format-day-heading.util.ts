const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

function toUtcDate(businessDate: string): Date {
  const [year = 0, month = 1, day = 1] = businessDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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

/** "22 out." for the short date of a transaction under a category. */
export function formatShortDate(businessDate: string): string {
  const label = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toUtcDate(businessDate));
  return label.replace(' de ', ' ');
}
