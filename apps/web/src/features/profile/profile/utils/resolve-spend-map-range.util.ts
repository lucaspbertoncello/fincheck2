import type { SpendMapPeriod } from '#/features/profile/profile/types/spend-map-period.type.ts';

/**
 * The ends of the period, both included (`YYYY-MM-DD`): the 1st to the last day of the month, or
 * 1 January to 31 December of the year. The year runs to its end even when it has not ended: the
 * map shows the days to come as empty outlines.
 */
export function resolveSpendMapRange(period: SpendMapPeriod): { from: string; to: string } {
  const year = Number(period.month.slice(0, 4));
  if (period.mode === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` };

  const month = Number(period.month.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return { from: `${period.month}-01`, to: `${period.month}-${String(lastDay).padStart(2, '0')}` };
}
