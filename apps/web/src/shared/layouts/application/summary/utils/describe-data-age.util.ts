import { calendarDaysBetween } from '#/shared/layouts/application/summary/utils/calendar-days-between.util.ts';

/** "de hoje", "de ontem" or "de 3 dias atrás": the age of a bank's data, for the stale chip. */
export function describeDataAge(updatedAt: string | null, now: Date): string {
  if (!updatedAt) return 'sem atualização';
  const days = calendarDaysBetween(new Date(updatedAt), now);
  if (days <= 0) return 'de hoje';
  if (days === 1) return 'de ontem';
  return `de ${days} dias atrás`;
}
