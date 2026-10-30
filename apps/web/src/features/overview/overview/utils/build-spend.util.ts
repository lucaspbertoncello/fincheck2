import type { ChartPoint } from '@fincheck/ui';
import type { SpendingCurve } from '@fincheck/shared/dashboard/spending-curve/spending-curve.type.ts';

import type { SpendData } from '#/features/overview/overview/overview.model.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

function toPoints(
  days: SpendingCurve.Dto['days'],
  pick: (day: SpendingCurve.Dto['days'][number]) => number | null,
): ChartPoint[] {
  return days.flatMap((day) => {
    const cents = pick(day);
    return cents === null ? [] : [{ day: day.day, cents }];
  });
}

/** Cumulative lines of "Gasto do mês". "Today" is the last day that already has a value. */
export function buildSpend(curve: SpendingCurve.Dto): SpendData {
  const current = toPoints(curve.days, (day) => day.currentCents);
  return {
    currentLabel: formatMonthParts(curve.month).monthLabel,
    previousLabel: formatMonthParts(curve.previousMonth).monthLabel,
    current,
    previous: toPoints(curve.days, (day) => day.previousCents),
    today: current.at(-1)?.day ?? 1,
    daysInMonth: curve.days.length,
  };
}
