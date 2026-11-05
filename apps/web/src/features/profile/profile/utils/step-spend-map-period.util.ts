import type { SpendMapPeriod } from '#/features/profile/profile/types/spend-map-period.type.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

/**
 * One arrow press: a month back or forward in "month", a year in "year" (same month). It never goes
 * past the current month: there is no spending to show in the future.
 */
export function stepSpendMapPeriod(
  period: SpendMapPeriod,
  direction: -1 | 1,
  currentMonth: string,
): SpendMapPeriod {
  const next = shiftMonthKey(period.month, direction * (period.mode === 'year' ? 12 : 1));

  return { ...period, month: next > currentMonth ? currentMonth : next };
}
