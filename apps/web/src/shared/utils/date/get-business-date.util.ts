const businessDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The business date (`YYYY-MM-DD`, America/Sao_Paulo) of an instant; today when none is given. */
export function getBusinessDate(date: Date = new Date()): string {
  return businessDateFormat.format(date);
}
