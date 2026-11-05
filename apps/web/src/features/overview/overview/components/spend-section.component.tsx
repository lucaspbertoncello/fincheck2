import { MonthSpendChart } from '@fincheck/ui';

import type { SpendData } from '#/features/overview/overview/overview.model.ts';

type SpendSectionProps = {
  data: SpendData;
};

/**
 * "Gasto do mês": the cumulative line against the previous month. On the phone it comes right
 * after the summary cards, which are boxes: no rule between them there.
 */
export function SpendSection({ data }: SpendSectionProps) {
  return (
    <div className="border-t border-line pt-s24 max-lg:border-t-0">
      <MonthSpendChart
        currentLabel={data.currentLabel}
        previousLabel={data.previousLabel}
        current={data.current}
        previous={data.previous}
        today={data.today}
        daysInMonth={data.daysInMonth}
      />
    </div>
  );
}
