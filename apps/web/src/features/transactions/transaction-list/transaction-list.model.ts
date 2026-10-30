import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useAcceptRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-accept-rule-suggestion.hook.ts';
import { useDismissRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-dismiss-rule-suggestion.hook.ts';
import { useRuleSuggestions } from '#/domain/categories/rule-suggestion/hooks/use-rule-suggestions.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateTag } from '#/domain/categories/tag/hooks/use-create-tag.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { useCategoryBreakdown } from '#/domain/dashboard/category-breakdown/hooks/use-category-breakdown.hook.ts';
import { useMonthSummary } from '#/domain/dashboard/month-summary/hooks/use-month-summary.hook.ts';
import { useBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-bulk-transactions.hook.ts';
import { useRestoreBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-restore-bulk-transactions.hook.ts';
import { useTransactionSummary } from '#/domain/transactions/transaction-summary/hooks/use-transaction-summary.hook.ts';
import { useDeleteTransaction } from '#/domain/transactions/transaction/hooks/use-delete-transaction.hook.ts';
import { useIgnoreTransaction } from '#/domain/transactions/transaction/hooks/use-ignore-transaction.hook.ts';
import { useResolveBankChange } from '#/domain/transactions/transaction/hooks/use-resolve-bank-change.hook.ts';
import { useRestoreOriginalTransaction } from '#/domain/transactions/transaction/hooks/use-restore-original-transaction.hook.ts';
import { useSplitTransaction } from '#/domain/transactions/transaction/hooks/use-split-transaction.hook.ts';
import { useTransactions } from '#/domain/transactions/transaction/hooks/use-transactions.hook.ts';
import { useUnignoreTransaction } from '#/domain/transactions/transaction/hooks/use-unignore-transaction.hook.ts';
import { useUnsplitTransaction } from '#/domain/transactions/transaction/hooks/use-unsplit-transaction.hook.ts';
import { useUpdateTransaction } from '#/domain/transactions/transaction/hooks/use-update-transaction.hook.ts';
import type { TransactionListSearch } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import { buildListQuery } from '#/features/transactions/transaction-list/utils/build-list-query.util.ts';

type ModelArgs = {
  month: string;
  search: TransactionListSearch;
  /** Transactions the "criar regra" question is about; empty while there is none. */
  ruleQuestionIds: readonly string[];
};

/**
 * Everything the Transações screen reads and writes, from the domain hooks: the month list with the
 * filters of the URL, the totals, the small catalogs (accounts, categories, tags), the "por
 * categoria" data when that view is on, and the mutations.
 */
export function useTransactionListModel({ month, search, ruleQuestionIds }: ModelArgs) {
  const isCategoryView = search.view === 'category';

  return {
    accounts: useAccounts({ includeArchived: true }),
    categories: useCategories({ status: 'all' }),
    tags: useTags({ includeArchived: true }),
    list: useTransactions(buildListQuery(month, search)),
    // The month without filters: the other legs of a transfer and the accounts of the category rows.
    monthTransactions: useTransactions(
      { month },
      { enabled: isCategoryView || Boolean(search.edit) },
    ),
    summary: useTransactionSummary(month),
    breakdown: useCategoryBreakdown(month, { enabled: isCategoryView }),
    monthSummary: useMonthSummary(month, { enabled: isCategoryView }),
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
