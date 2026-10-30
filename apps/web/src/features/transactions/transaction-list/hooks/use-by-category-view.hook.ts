import { useState } from 'react';

import type { useTransactionListSearch } from '#/features/transactions/transaction-list/hooks/use-transaction-list-search.hook.ts';
import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { ByCategoryView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import {
  buildCategoryGroups,
  UNCATEGORIZED_GROUP_ID,
} from '#/features/transactions/transaction-list/utils/build-category-groups.util.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

type ByCategoryArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  month: string;
  search: ReturnType<typeof useTransactionListSearch>['search'];
  update: ReturnType<typeof useTransactionListSearch>['update'];
  onReview: () => void;
};

/** The "Por categoria" view: the cards and the groups, null while the breakdown is not loaded. */
export function useByCategoryView({
  model,
  lookups,
  month,
  search,
  update,
  onReview,
}: ByCategoryArgs): { view: ByCategoryView | null; empty: boolean } {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const breakdown = model.breakdown.data;
  const monthSummary = model.monthSummary.data;
  if (!breakdown || !monthSummary) return { view: null, empty: false };

  const transactionsById = new Map(
    (model.monthTransactions.data?.items ?? []).map((item) => [item.id, item]),
  );
  const groups = buildCategoryGroups(breakdown, lookups, transactionsById, search.q ?? '');

  return {
    empty: Boolean(search.q) && groups.expenses.length === 0 && groups.incomes.length === 0,
    view: {
      expenseCard: {
        spentCents: monthSummary.expenses.spentCents,
        previousSamePointCents: monthSummary.expenses.previousSpentCents,
        previousTotalCents: breakdown.expenses.previousTotalCents,
        previousMonthLabel: formatMonthParts(shiftMonthKey(month, -1)).monthLabel.toLowerCase(),
      },
      incomeCard: {
        receivedCents: breakdown.incomes.receivedCents,
        expectedCents: breakdown.incomes.expectedCents,
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
