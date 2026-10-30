import { MonthSpendChart } from '@fincheck/ui';

import type { SpendData } from '#/features/overview/overview/overview.model.ts';

type SpendSectionProps = {
  data: SpendData;
};

/** "Gasto do mês": the cumulative line against the previous month. */
export function SpendSection({ data }: SpendSectionProps) {
  return (
    <div className="border-t border-line pt-s24">
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
