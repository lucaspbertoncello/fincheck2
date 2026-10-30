const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });

/** `2026-11-20` -> "sex, 20/11"; without a day, "qualquer dia de novembro". */
export function formatPreviewDate(expectedOn: string | null, month: string): string {
  if (expectedOn) {
    const [year = 0, monthNumber = 1, day = 1] = expectedOn.split('-').map(Number);
    return dateFormat
      .format(new Date(Date.UTC(year, monthNumber - 1, day)))
      .replace('.,', ',')
      .replace('.', '');
  }
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);

  return `qualquer dia de ${monthFormat.format(new Date(Date.UTC(year, monthNumber - 1, 1)))}`;
}
