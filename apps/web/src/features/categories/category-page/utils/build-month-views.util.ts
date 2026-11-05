import { buildRowView } from '#/features/transactions/transaction-list/utils/build-row-view.util.ts';
import type { TransactionDay } from '#/features/transactions/transaction-list/types/transaction-day.type.ts';
import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import type { TransactionMonthView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import { countWord } from '#/features/transactions/transaction-list/utils/count-word.util.ts';
import { groupDaysByMonth } from '#/features/transactions/transaction-list/utils/group-days-by-month.util.ts';

/** The days under their month, each row ready for `DayList`, as the wider periods of Transações show them. */
export function buildMonthViews(
  days: readonly TransactionDay[],
  lookups: TransactionLookups,
): TransactionMonthView[] {
  return groupDaysByMonth(days).map((month) => ({
    key: month.key,
    label: month.label,
    countLabel: countWord(month.count, 'transação', 'transações'),
    days: month.days.map((day) => ({
      date: day.date,
      title: day.title,
      dateLabel: day.dateLabel,
      count: day.count,
      totalCents: day.totalCents,
      rows: day.items.map((item) => buildRowView(item, lookups)),
    })),
  }));
}
