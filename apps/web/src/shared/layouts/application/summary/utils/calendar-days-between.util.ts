const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar days (São Paulo) from `from` to `to`: 0 when both fall on the same day. */
export function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.parse(dayFormat.format(from));
  const b = Date.parse(dayFormat.format(to));
  return Math.round((b - a) / DAY_MS);
}
