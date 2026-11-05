import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import { useState } from 'react';

import { UNCATEGORIZED_GROUP_ID } from '#/features/transactions/transaction-list/constants/uncategorized-group-id.constant.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/types/period-range.type.ts';
import type { useTransactionListSearch } from '#/features/transactions/transaction-list/hooks/use-transaction-list-search.hook.ts';
import type { TransactionListSearch } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { ByCategoryView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import { buildCategoryGroups } from '#/features/transactions/transaction-list/utils/build-category-groups.util.ts';
import { describeReceivedIn } from '#/features/transactions/transaction-list/utils/describe-received-in.util.ts';
import { describePreviousPeriod } from '#/features/transactions/transaction-list/utils/describe-previous-period.util.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

type ByCategoryArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  month: string;
  /** The ends of the period when it is wider than the month. */
  range: PeriodRange;
  search: ReturnType<typeof useTransactionListSearch>['search'];
  update: ReturnType<typeof useTransactionListSearch>['update'];
  onReview: () => void;
};

/**
 * The "Por categoria" view: the cards and the groups, null while the breakdown is not loaded. In the
 * month the expense card compares with the same point of the month before; in a wider period it
 * compares with the period of the same size right before, and over "Tudo" it does not compare.
 */
export function useByCategoryView({
  model,
  lookups,
  month,
  range,
  search,
  update,
  onReview,
}: ByCategoryArgs): { view: ByCategoryView | null; empty: boolean } {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const isMonth = search.period === 'month';
  const breakdown = isMonth ? model.breakdown.data : model.periodBreakdown.data;
  const monthSummary = model.monthSummary.data;
  if (!breakdown || (isMonth && !monthSummary)) return { view: null, empty: false };

  const transactionsById = new Map(
    (model.monthTransactions.data?.items ?? []).map((item) => [item.id, item]),
  );
  const groups = buildCategoryGroups(breakdown, lookups, transactionsById, search.q ?? '');

  return {
    empty: Boolean(search.q) && groups.expenses.length === 0 && groups.incomes.length === 0,
    view: {
      expenseCard:
        isMonth && monthSummary
          ? {
              spentCents: monthSummary.expenses.spentCents,
              comparison: {
                previousSamePointCents: monthSummary.expenses.previousSpentCents,
                previousTotalCents: breakdown.expenses.previousTotalCents ?? 0,
                previousLabel: formatMonthParts(shiftMonthKey(month, -1)).monthLabel.toLowerCase(),
              },
            }
          : {
              spentCents: breakdown.expenses.totalCents,
              comparison: buildPeriodComparison(breakdown, search.period, range),
            },
      incomeCard: {
        receivedCents: breakdown.incomes.receivedCents,
        expectedCents: isMonth ? breakdown.incomes.expectedCents : null,
        receivedLegend: describeReceivedIn(search.period),
        sourceCount: groups.incomes.length,
      },
      expenses: groups.expenses,
      expensesTotalCents: breakdown.expenses.totalCents,
      incomes: groups.incomes,
      incomesTotalCents: breakdown.incomes.receivedCents,
      showExpenses: search.type !== 'income',
      showIncomes: search.type !== 'expense',
      openGroupId,
      onOpenGroupChange: (id, open) => setOpenGroupId(open ? id : null),
      onSeeAll: (id) =>
        update({
          view: 'list',
          q: null,
          category: id === UNCATEGORIZED_GROUP_ID ? null : id,
          uncategorized: id === UNCATEGORIZED_GROUP_ID ? true : null,
        }),
      onReview,
    },
  };
}

function buildPeriodComparison(
  breakdown: CategoryBreakdown.Dto,
  period: TransactionListSearch['period'],
  range: PeriodRange,
): ByCategoryView['expenseCard']['comparison'] {
  const previousLabel = describePreviousPeriod(period, range);
  const previousTotalCents = breakdown.expenses.previousTotalCents;
  if (previousLabel === null || previousTotalCents === null) return null;

  // A period has no "same point" to stop at: it is compared whole against the whole one before.
  return { previousSamePointCents: previousTotalCents, previousTotalCents, previousLabel };
}
