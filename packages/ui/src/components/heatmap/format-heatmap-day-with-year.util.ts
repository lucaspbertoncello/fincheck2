const dayWithYearFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "terça-feira, 12 de março de 2026": the tip, since the map can span two years. */
export function formatHeatmapDayWithYear(date: string): string {
  return dayWithYearFormat.format(new Date(`${date}T00:00:00Z`));
}
