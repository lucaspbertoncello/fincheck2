import type { SpendMapPeriod } from '#/features/profile/profile/types/spend-map-period.type.ts';

/** Whether the period is already the current month (or the current year): the next arrow stops. */
export function isSpendMapPeriodCurrent(period: SpendMapPeriod, currentMonth: string): boolean {
  return period.mode === 'year'
    ? period.month.slice(0, 4) >= currentMonth.slice(0, 4)
    : period.month >= currentMonth;
}
