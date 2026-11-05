import { useState } from 'react';

import type { SpendMapPeriod } from '#/features/profile/profile/types/spend-map-period.type.ts';
import { isSpendMapPeriodCurrent } from '#/features/profile/profile/utils/is-spend-map-period-current.util.ts';
import { stepSpendMapPeriod } from '#/features/profile/profile/utils/step-spend-map-period.util.ts';
import { getCurrentMonthKey } from '#/shared/utils/get-current-month-key.util.ts';

/**
 * The period of the Perfil spend map: the year of today at first (BR-PRF-003), switched to a month
 * and moved with the arrows, never past the current month. Switching keeps where the person was.
 */
export function useSpendMapPeriod() {
  const currentMonth = getCurrentMonthKey(new Date());
  const [period, setPeriod] = useState<SpendMapPeriod>(() => ({
    mode: 'year',
    month: currentMonth,
  }));

  return {
    period,
    isCurrent: isSpendMapPeriodCurrent(period, currentMonth),
    setMode: (mode: SpendMapPeriod['mode']) => setPeriod((previous) => ({ ...previous, mode })),
    goToPrevious: () => setPeriod((previous) => stepSpendMapPeriod(previous, -1, currentMonth)),
    goToNext: () => setPeriod((previous) => stepSpendMapPeriod(previous, 1, currentMonth)),
  };
}
