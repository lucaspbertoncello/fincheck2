import { calendarDaysBetween } from '#/shared/layouts/application/summary/utils/calendar-days-between.util.ts';

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
