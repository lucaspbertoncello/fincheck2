const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

/**
 * "seg., 9 nov." from a business date (`YYYY-MM-DD`), with no time zone drift: the day in the tip of
 * the spend map, short enough for one line. With `today` given, a day from another year carries it
 * ("qua., 31 dez. 2025"), since the year map can span two years.
 */
export function formatHeatmapDayShort(date: string, today?: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  const base = `${weekdayFormat.format(day)}, ${day.getUTCDate()} ${monthFormat.format(day)}`;
  return today && today.slice(0, 4) !== date.slice(0, 4) ? `${base} ${date.slice(0, 4)}` : base;
}
