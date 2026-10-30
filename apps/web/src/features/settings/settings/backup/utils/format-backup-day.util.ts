const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
});

/** "21/10": the day of a backup, in São Paulo time. */
export function formatBackupDay(instant: string): string {
  return dayFormat.format(new Date(instant));
}
