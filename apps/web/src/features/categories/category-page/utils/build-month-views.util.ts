import { buildRowView } from '#/shared/utils/transactions/build-row-view.util.ts';
import type { TransactionDay } from '#/shared/types/transactions/transaction-day.type.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import type { TransactionMonthView } from '#/shared/types/transactions/transaction-list-view.type.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';
import { groupDaysByMonth } from '#/shared/utils/transactions/group-days-by-month.util.ts';

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
