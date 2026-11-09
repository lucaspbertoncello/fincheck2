import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The period of the curiosities that look at the last 12 months: 12 calendar months, the current
// one and the 11 before it (the same as the spend heatmap), from the first day of the oldest up to
// today. A day that has not come yet is not spending. Pure.
export function computeHighlightWindow(today: BusinessDate): {
  from: BusinessDate;
  to: BusinessDate;
} {
  return { from: Month.containing(today.addMonths(-11)).firstDay(), to: today };
}
