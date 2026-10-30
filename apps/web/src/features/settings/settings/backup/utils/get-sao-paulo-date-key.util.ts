const dateKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The business date (`YYYY-MM-DD`, São Paulo time) of an instant. */
export function getSaoPauloDateKey(date: Date): string {
  return dateKeyFormat.format(date);
}
