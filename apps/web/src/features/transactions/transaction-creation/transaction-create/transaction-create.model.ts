import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateTransaction } from '#/domain/transactions/transaction/hooks/use-create-transaction.hook.ts';
import { useDeleteTransaction } from '#/domain/transactions/transaction/hooks/use-delete-transaction.hook.ts';
import { useTransactions } from '#/domain/transactions/transaction/hooks/use-transactions.hook.ts';
import { getCurrentMonthKey } from '#/shared/utils/get-current-month-key.util.ts';

/**
 * What "Nova transação" reads (active accounts and categories, and this month's transactions to
 * learn which categories are used most) and writes (create, and delete for the undo).
 */
export function useTransactionCreateModel() {
  return {
    accounts: useAccounts(),
    categories: useCategories({ status: 'active' }),
    monthTransactions: useTransactions({ month: getCurrentMonthKey(new Date()) }),
    createTransaction: useCreateTransaction(),
    deleteTransaction: useDeleteTransaction(),
  };
}
