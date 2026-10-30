const MINUTE_MS = 60_000;

/** How long ago the bank data was updated: "agora", "há 12 min", "há 3 h", "ontem", "há 5 dias". */
export function formatSyncAge(updatedAt: string, now: Date): string {
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - new Date(updatedAt).getTime()) / MINUTE_MS),
  );
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ontem' : `há ${days} dias`;
}
