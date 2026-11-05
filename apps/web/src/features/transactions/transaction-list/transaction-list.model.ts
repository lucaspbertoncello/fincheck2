import type { PeriodRange } from '#/features/transactions/transaction-list/types/period-range.type.ts';
import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useAcceptRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-accept-rule-suggestion.hook.ts';
import { useDismissRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-dismiss-rule-suggestion.hook.ts';
import { useRuleSuggestions } from '#/domain/categories/rule-suggestion/hooks/use-rule-suggestions.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateTag } from '#/domain/categories/tag/hooks/use-create-tag.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { useCategoryBreakdownPeriod } from '#/domain/dashboard/category-breakdown/hooks/use-category-breakdown-period.hook.ts';
import { useCategoryBreakdown } from '#/domain/dashboard/category-breakdown/hooks/use-category-breakdown.hook.ts';
import { useMonthSummary } from '#/domain/dashboard/month-summary/hooks/use-month-summary.hook.ts';
import { useConnections } from '#/domain/sync/connection/hooks/use-connections.hook.ts';
import { useStartConnectionRun } from '#/domain/sync/run/hooks/use-start-connection-run.hook.ts';
import { useBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-bulk-transactions.hook.ts';
import { useRestoreBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-restore-bulk-transactions.hook.ts';
import { useTransactionSummary } from '#/domain/transactions/transaction-summary/hooks/use-transaction-summary.hook.ts';
import { useDeleteTransaction } from '#/domain/transactions/transaction/hooks/use-delete-transaction.hook.ts';
import { useIgnoreTransaction } from '#/domain/transactions/transaction/hooks/use-ignore-transaction.hook.ts';
import { useResolveBankChange } from '#/domain/transactions/transaction/hooks/use-resolve-bank-change.hook.ts';
import { useRestoreOriginalTransaction } from '#/domain/transactions/transaction/hooks/use-restore-original-transaction.hook.ts';
import { useSplitTransaction } from '#/domain/transactions/transaction/hooks/use-split-transaction.hook.ts';
import { useInfiniteTransactions } from '#/domain/transactions/transaction/hooks/use-infinite-transactions.hook.ts';
import { useTransactions } from '#/domain/transactions/transaction/hooks/use-transactions.hook.ts';
import { useUnignoreTransaction } from '#/domain/transactions/transaction/hooks/use-unignore-transaction.hook.ts';
import { useUnsplitTransaction } from '#/domain/transactions/transaction/hooks/use-unsplit-transaction.hook.ts';
import { useUpdateTransaction } from '#/domain/transactions/transaction/hooks/use-update-transaction.hook.ts';
import type { TransactionListSearch } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import { buildListQuery } from '#/features/transactions/transaction-list/utils/build-list-query.util.ts';
import { buildPeriodListQuery } from '#/features/transactions/transaction-list/utils/build-period-list-query.util.ts';

type ModelArgs = {
  month: string;
  /** The ends of a period wider than the month; empty for the month and for "Tudo". */
  range: PeriodRange;
  search: TransactionListSearch;
  /** Transactions the "criar regra" question is about; empty while there is none. */
  ruleQuestionIds: readonly string[];
};

/**
 * Everything the Transações screen reads and writes, from the domain hooks: the month list (or the
 * pages of a wider period) with the filters of the URL, the totals, the small catalogs (accounts, categories, tags), the "por
 * categoria" data when that view is on, and the mutations.
 */
export function useTransactionListModel({ month, range, search, ruleQuestionIds }: ModelArgs) {
  const isCategoryView = search.view === 'category';
  const isMonth = search.period === 'month';

  return {
    accounts: useAccounts({ includeArchived: true }),
    categories: useCategories({ status: 'all' }),
    tags: useTags({ includeArchived: true }),
    list: useTransactions(buildListQuery(month, search), { enabled: isMonth }),
    // A wider period is read page by page, with the cursor, as the list scrolls.
    periodList: useInfiniteTransactions(buildPeriodListQuery(range, search), {
      enabled: !isMonth,
    }),
    // The month without filters: the other legs of a transfer and the accounts of the category rows.
    monthTransactions: useTransactions(
      { month },
      { enabled: isMonth && (isCategoryView || Boolean(search.edit)) },
    ),
    summary: useTransactionSummary(month, { enabled: isMonth }),
    connections: useConnections(),
    startRun: useStartConnectionRun(),
    breakdown: useCategoryBreakdown(month, { enabled: isMonth && isCategoryView }),
    // The totals of a wider period come from the categories (the list view shows them too).
    periodBreakdown: useCategoryBreakdownPeriod(range, { enabled: !isMonth }),
    monthSummary: useMonthSummary(month, { enabled: isMonth && isCategoryView }),
    ruleSuggestions: useRuleSuggestions(ruleQuestionIds),
    updateTransaction: useUpdateTransaction(),
    ignoreTransaction: useIgnoreTransaction(),
    unignoreTransaction: useUnignoreTransaction(),
    deleteTransaction: useDeleteTransaction(),
    splitTransaction: useSplitTransaction(),
    unsplitTransaction: useUnsplitTransaction(),
    restoreOriginal: useRestoreOriginalTransaction(),
    resolveBankChange: useResolveBankChange(),
    bulkTransactions: useBulkTransactions(),
    restoreBulk: useRestoreBulkTransactions(),
    createTag: useCreateTag(),
    acceptRuleSuggestion: useAcceptRuleSuggestion(),
    dismissRuleSuggestion: useDismissRuleSuggestion(),
  };
}

export type TransactionListModel = ReturnType<typeof useTransactionListModel>;
