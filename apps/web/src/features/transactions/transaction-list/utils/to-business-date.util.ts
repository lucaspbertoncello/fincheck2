const businessDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The business date (`YYYY-MM-DD`, America/Sao_Paulo) of an instant. */
export function toBusinessDate(date: Date): string {
  return businessDateFormat.format(date);
}
