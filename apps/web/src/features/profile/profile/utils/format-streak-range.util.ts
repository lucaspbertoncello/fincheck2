import { formatHighlightDay } from '#/features/profile/profile/utils/format-highlight-day.util.ts';

/** "2 a 5 mai" inside one month, "28 abr a 2 mai" across two; the year only when it is not the current one. */
export function formatStreakRange(from: string, to: string, today: string): string {
  if (from === to) return formatHighlightDay(from, today);
  const end = formatHighlightDay(to, today);
  if (from.slice(0, 7) !== to.slice(0, 7)) return `${formatHighlightDay(from, today)} a ${end}`;

  // Same month: the first date drops the month (and the year) it shares with the last.
  return `${Number(from.slice(8, 10))} a ${end}`;
}
