const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const shortDayFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
});

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.parse(dayFormat.format(from));
  const b = Date.parse(dayFormat.format(to));
  return Math.round((b - a) / DAY_MS);
}

/**
 * "Sincronizado há 12 min", "Sincronizado há 3 h", "Ontem, 18:40" or "27/10, 18:40": when the
 * bank last updated the account, relative to `now`.
 */
export function describeUpdateTime(updatedAt: string | null, now: Date): string {
  if (!updatedAt) return 'Ainda sem atualização';
  const updated = new Date(updatedAt);
  const elapsed = now.getTime() - updated.getTime();
  if (elapsed < MINUTE_MS) return 'Sincronizado agora';
  if (elapsed < HOUR_MS) return `Sincronizado há ${Math.floor(elapsed / MINUTE_MS)} min`;
  const days = calendarDaysBetween(updated, now);
  if (days === 0) return `Sincronizado há ${Math.floor(elapsed / HOUR_MS)} h`;
  const time = timeFormat.format(updated);
  if (days === 1) return `Ontem, ${time}`;
  return `${shortDayFormat.format(updated)}, ${time}`;
}

/** "de hoje", "de ontem" or "de 3 dias atrás": the age of a bank's data, for the stale chip. */
export function describeDataAge(updatedAt: string | null, now: Date): string {
  if (!updatedAt) return 'sem atualização';
  const days = calendarDaysBetween(new Date(updatedAt), now);
  if (days <= 0) return 'de hoje';
  if (days === 1) return 'de ontem';
  return `de ${days} dias atrás`;
}
