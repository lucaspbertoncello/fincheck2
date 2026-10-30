const DAY_MS = 86_400_000;

function toTime(businessDate: string): number {
  const [year = 0, month = 1, day = 1] = businessDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * How far an open cycle has gone, from 0 (just opened) to 1 (closing day). The cycle starts one
 * month before the closing date; the API sends no start, only the closing day.
 */
export function getCycleProgress(closesOn: string, today: string): number {
  const end = toTime(closesOn);
  const closing = new Date(end);
  const start = Date.UTC(closing.getUTCFullYear(), closing.getUTCMonth() - 1, closing.getUTCDate());
  const length = (end - start) / DAY_MS;
  const elapsed = (toTime(today) - start) / DAY_MS;
  return Math.min(1, Math.max(0, elapsed / length));
}
