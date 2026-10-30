import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateTransaction } from '#/domain/transactions/transaction/hooks/use-create-transaction.hook.ts';
import { useDeleteTransaction } from '#/domain/transactions/transaction/hooks/use-delete-transaction.hook.ts';

/** What "Nova transação" reads (active accounts and categories) and writes (create, and delete for the undo). */
export function useTransactionCreateModel() {
  return {
    accounts: useAccounts(),
    categories: useCategories({ status: 'active' }),
    createTransaction: useCreateTransaction(),
    deleteTransaction: useDeleteTransaction(),
  };
}

export type TransactionCreateModel = ReturnType<typeof useTransactionCreateModel>;
