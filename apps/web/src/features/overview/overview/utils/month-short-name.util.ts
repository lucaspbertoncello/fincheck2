import { monthName } from '#/features/overview/overview/utils/month-name.util.ts';

/** `2026-09` -> `set.`: the short form of the month, for the donut center ("+108% que set."). */
export function monthShortName(monthKey: string): string {
  return `${monthName(monthKey).slice(0, 3)}.`;
}
