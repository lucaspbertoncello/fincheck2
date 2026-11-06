import { PERIOD_OPTIONS } from '#/shared/constants/transactions/period-options.constant.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import { useTransactionListSearch } from '#/shared/hooks/transactions/use-transaction-list-search.hook.ts';
import type { TransactionPeriod } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';
import type { TransactionPeriodPickerProps } from '#/shared/types/transactions/transaction-period-picker.type.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';
import { formatPeriodRange } from '#/shared/utils/transactions/format-period-range.util.ts';
import { resolvePeriodRange } from '#/shared/utils/transactions/resolve-period-range.util.ts';

/**
 * The header picker of Transações: the month of the app plus the period menu (Mês · 12 meses ·
 * Este ano · Tudo). The month stays the app's own; a wider period lives in the URL of this screen
 * only (`?period=`) and takes the month's place in the picker with its range.
 */
export function useTransactionPeriodPicker(): TransactionPeriodPickerProps {
  const month = useSelectedMonth();
  const { search, update } = useTransactionListSearch();
  const range = resolvePeriodRange(search.period, getBusinessDate(new Date()));

  return {
    monthLabel: month.monthLabel,
    yearLabel: month.yearLabel,
    onPrevious: month.goToPrevious,
    onNext: month.goToNext,
    periodOptions: PERIOD_OPTIONS,
    period: search.period,
    rangeLabel: formatPeriodRange(search.period, range),
    // A day of the spend map belongs to a month: leaving the month drops it.
    onPeriodChange: (key) => update({ period: key as TransactionPeriod, day: null }),
  };
}
