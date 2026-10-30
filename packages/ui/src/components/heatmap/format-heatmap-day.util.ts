const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "terça-feira, 12 de março" from a business date (`YYYY-MM-DD`), with no time zone drift. */
export function formatHeatmapDay(date: string): string {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}
