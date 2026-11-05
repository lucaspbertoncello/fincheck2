import { MonthPicker } from '@fincheck/ui';

import { PERIOD_OPTIONS } from '#/features/transactions/transaction-list/constants/period-options.constant.ts';
import { useTransactionListSearch } from '#/features/transactions/transaction-list/hooks/use-transaction-list-search.hook.ts';
import type { TransactionPeriod } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import { formatPeriodRange } from '#/features/transactions/transaction-list/utils/format-period-range.util.ts';
import { resolvePeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';
import { toBusinessDate } from '#/features/transactions/transaction-list/utils/to-business-date.util.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

/**
 * The header picker of Transações: the month picker of the app plus the period menu (Mês · 12 meses
 * · Este ano · Tudo). The month stays the app's own; a wider period lives in the URL of this screen
 * only (`?period=`) and takes the month's place in the picker with its range.
 */
export function TransactionPeriodPicker() {
  const month = useSelectedMonth();
  const { search, update } = useTransactionListSearch();
  const range = resolvePeriodRange(search.period, toBusinessDate(new Date()));

  return (
    <MonthPicker
      monthLabel={month.monthLabel}
      yearLabel={month.yearLabel}
      onPrevious={month.goToPrevious}
      onNext={month.goToNext}
      period={{
        options: PERIOD_OPTIONS,
        value: search.period,
        // A day of the spend map belongs to a month: leaving the month drops it.
        onChange: (key) => update({ period: key as TransactionPeriod, day: null }),
        monthKey: 'month',
        rangeLabel: formatPeriodRange(search.period, range),
      }}
    />
  );
}
