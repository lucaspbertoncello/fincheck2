import { HEATMAP_MONTHS } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.constant.ts';

import type { SpendWindow } from '#mocks/profile/highlights/spend-window.type.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { daysBetween } from '#mocks/support/dates/days-between.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { buildLines } from '#mocks/transactions/transaction/build-lines.util.ts';

// What the 12-month curiosities read: the spending lines by competence (BR-DSH-001) and the total
// of each day, over the same window as the spend heatmap.
export function listSpendWindow(database: MockState.Database): SpendWindow {
  const fromOn = `${addMonths(TODAY.slice(0, 7), -(HEATMAP_MONTHS - 1))}-01`;
  const lines = buildLines(database)
    .filter(
      (line) =>
        line.nature === 'expense' && line.competenceOn >= fromOn && line.competenceOn <= TODAY,
    )
    .map((line) => ({ ...line, spentCents: -line.amountCents }));

  const spentByDay = new Map<string, number>();
  for (const line of lines)
    spentByDay.set(line.competenceOn, (spentByDay.get(line.competenceOn) ?? 0) + line.spentCents);
  for (const [date, total] of spentByDay) spentByDay.set(date, Math.max(0, total));

  const dates = Array.from({ length: daysBetween(fromOn, TODAY) + 1 }, (_, index) =>
    addDays(fromOn, index),
  );

  return { fromOn, untilOn: TODAY, dates, lines, spentByDay };
}
