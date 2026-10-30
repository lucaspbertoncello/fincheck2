const hourFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  hourCycle: 'h23',
});

/** Icon of the date line: sunrise until 11, sun until 17, sunset until 19, moon at night. */
export function getTimeOfDayIcon(now: Date): 'sunrise' | 'sun' | 'sunset' | 'moon' {
  const hour = Number(hourFormat.format(now));
  if (hour >= 5 && hour < 11) return 'sunrise';
  if (hour >= 11 && hour < 17) return 'sun';
  if (hour >= 17 && hour < 19) return 'sunset';
  return 'moon';
}
