const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today as a business date (`YYYY-MM-DD`, America/Sao_Paulo). */
export function getTodayBusinessDate(now: Date): string {
  return dateFormat.format(now);
}
