const monthKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
});

/** Month of a date in the business time zone, as `YYYY-MM` (the format of the `month` search param). */
export function getCurrentMonthKey(now: Date): string {
  return monthKeyFormat.format(now);
}
