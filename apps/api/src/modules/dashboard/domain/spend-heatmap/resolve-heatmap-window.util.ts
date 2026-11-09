import { HEATMAP_MONTHS } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.constant.ts';

import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The days the map shows. Asked by `from` and `to` (both ends included): exactly that. Otherwise
// 12 whole calendar months, from the 1st of the month 11 months before `until` (today by default)
// up to `until`, so the month legends fall on a month border with no square cut at the start.
export function resolveHeatmapWindow(input: {
  until: BusinessDate | undefined;
  from: BusinessDate | undefined;
  to: BusinessDate | undefined;
  today: BusinessDate;
}): { fromOn: BusinessDate; untilOn: BusinessDate } {
  if (input.from && input.to) return { fromOn: input.from, untilOn: input.to };

  const untilOn = input.until ?? input.today;
  let first = Month.containing(untilOn);
  for (let count = 1; count < HEATMAP_MONTHS; count++) first = first.previous();

  return { fromOn: first.firstDay(), untilOn };
}
