const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "agora há pouco", "há 12 min", "há 3 h", "há 2 dias": how long ago an instant was. */
export function formatTimeAgo(instant: string, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - new Date(instant).getTime());

  if (elapsed < MINUTE) return 'agora há pouco';
  if (elapsed < HOUR) return `há ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `há ${Math.floor(elapsed / HOUR)} h`;

  const days = Math.floor(elapsed / DAY);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}
