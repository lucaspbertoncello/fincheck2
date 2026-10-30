const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today in the business time zone, as `YYYY-MM-DD`. */
export function getBusinessToday(now: Date = new Date()): string {
  return dateFormat.format(now);
}
