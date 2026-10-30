const format = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "14 de outubro" from a business date (`YYYY-MM-DD`). */
export function formatPeakDay(date: string): string {
  return format.format(new Date(`${date}T00:00:00Z`));
}
