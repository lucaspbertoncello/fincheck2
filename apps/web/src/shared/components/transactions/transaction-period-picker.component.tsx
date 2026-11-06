import { MonthPicker } from '@fincheck/ui';

import type { TransactionPeriodPickerProps } from '#/shared/types/transactions/transaction-period-picker.type.ts';

/** The month picker of the app with the period menu next to it (BR-TRX-007). */
export function TransactionPeriodPicker({
  monthLabel,
  yearLabel,
  onPrevious,
  onNext,
  periodOptions,
  period,
  rangeLabel,
  onPeriodChange,
}: TransactionPeriodPickerProps) {
  return (
    <MonthPicker
      monthLabel={monthLabel}
      yearLabel={yearLabel}
      onPrevious={onPrevious}
      onNext={onNext}
      period={{
        options: periodOptions,
        value: period,
        onChange: onPeriodChange,
        monthKey: 'month',
        rangeLabel,
      }}
    />
  );
}
