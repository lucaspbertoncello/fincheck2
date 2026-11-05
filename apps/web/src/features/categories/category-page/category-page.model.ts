import type { PeriodRange } from '#/features/transactions/transaction-list/types/period-range.type.ts';
import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useArchiveCategory } from '#/domain/categories/category/hooks/use-archive-category.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useUnarchiveCategory } from '#/domain/categories/category/hooks/use-unarchive-category.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { useCategoryBreakdownPeriod } from '#/domain/dashboard/category-breakdown/hooks/use-category-breakdown-period.hook.ts';
import { useCategoryTrend } from '#/domain/dashboard/category-trend/hooks/use-category-trend.hook.ts';
import { useBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-bulk-transactions.hook.ts';
import { useRestoreBulkTransactions } from '#/domain/transactions/transaction-bulk/hooks/use-restore-bulk-transactions.hook.ts';
import { useIgnoreTransaction } from '#/domain/transactions/transaction/hooks/use-ignore-transaction.hook.ts';
import { useInfiniteTransactions } from '#/domain/transactions/transaction/hooks/use-infinite-transactions.hook.ts';
import { useResolveBankChange } from '#/domain/transactions/transaction/hooks/use-resolve-bank-change.hook.ts';
import { useUnignoreTransaction } from '#/domain/transactions/transaction/hooks/use-unignore-transaction.hook.ts';
import { PERIOD_PAGE_SIZE } from '#/features/transactions/transaction-list/constants/period-options.constant.ts';

type ModelArgs = {
  categoryId: string;
  /** The ends of the period; empty for "Tudo". */
  range: PeriodRange;
};

/**
 * What the category page reads and writes: the categories (to find this one; the rest waits for it), the totals of the
 * period, the 12 months of bars, the transactions of the category page by page, the small catalogs
 * the rows need, and the moves of a row and of the category itself (archive and bring back).
 */
export function useCategoryPageModel({ categoryId, range }: ModelArgs) {
  const categories = useCategories({ status: 'all' });
  const category = categories.data?.items.find((item) => item.id === categoryId);
  // Nothing else is read until the category is known to exist.
  const enabled = Boolean(category);

  return {
    categories,
    category,
    accounts: useAccounts({ includeArchived: true }),
    tags: useTags({ includeArchived: true }),
    breakdown: useCategoryBreakdownPeriod(range, { enabled }),
    trend: useCategoryTrend(categoryId, undefined, { enabled }),
    list: useInfiniteTransactions({ ...range, limit: PERIOD_PAGE_SIZE, categoryId }, { enabled }),
    ignoreTransaction: useIgnoreTransaction(),
    unignoreTransaction: useUnignoreTransaction(),
    bulkTransactions: useBulkTransactions(),
    restoreBulk: useRestoreBulkTransactions(),
    resolveBankChange: useResolveBankChange(),
    archiveCategory: useArchiveCategory(),
    unarchiveCategory: useUnarchiveCategory(),
  };
}

export type CategoryPageModel = ReturnType<typeof useCategoryPageModel>;
