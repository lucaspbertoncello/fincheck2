import { countHeatmapDays } from '@fincheck/shared/dashboard/spend-heatmap/count-heatmap-days.util.ts';

import { computeComparisonWindow } from '#/modules/dashboard/domain/month-comparison/compute-comparison-window.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// What a read of the categories looks at and compares it with. A month: day 1 to the same point
// as the overview, against the same window of the month before (BR-DSH-004). A free period: both
// ends included, against the period of the same size right before. Nothing: all the history, with
// no period before and so no comparison. `fromOn` and `untilOn` null mean "no limit".
export function computeBreakdownWindow(input: {
  month: Month | undefined;
  from: BusinessDate | undefined;
  to: BusinessDate | undefined;
  today: BusinessDate;
}): ComputeBreakdownWindow.Window {
  if (input.month) {
    const window = computeComparisonWindow(input.month, input.today);

    return {
      month: input.month.value,
      fromOn: window.fromOn.value,
      untilOn: window.asOfOn.value,
      previous: { fromOn: window.previousFromOn.value, untilOn: window.previousUntilOn.value },
      comparedUntilOn: window.asOfOn.value,
      wholeMonth: { fromOn: input.month.firstDay().value, untilOn: input.month.lastDay().value },
    };
  }
  if (input.from && input.to) {
    const days = countHeatmapDays(input.from.value, input.to.value);
    const previousUntil = input.from.addDays(-1);

    return {
      month: null,
      fromOn: input.from.value,
      untilOn: input.to.value,
      previous: {
        fromOn: previousUntil.addDays(-(days - 1)).value,
        untilOn: previousUntil.value,
      },
      comparedUntilOn: input.to.value,
      wholeMonth: null,
    };
  }

  return {
    month: null,
    fromOn: null,
    untilOn: null,
    previous: null,
    comparedUntilOn: null,
    wholeMonth: null,
  };
}

export namespace ComputeBreakdownWindow {
  export type Window = {
    month: string | null;
    fromOn: string | null;
    untilOn: string | null;
    previous: { fromOn: string; untilOn: string } | null;
    comparedUntilOn: string | null;
    // The whole month, for what is expected of it; only when the read is of a month.
    wholeMonth: { fromOn: string; untilOn: string } | null;
  };
}
