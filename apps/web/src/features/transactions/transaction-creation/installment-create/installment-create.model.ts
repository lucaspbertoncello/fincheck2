import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateInstallmentPlan } from '#/domain/transactions/installment-plan/hooks/use-create-installment-plan.hook.ts';
import { useDeleteInstallmentPlan } from '#/domain/transactions/installment-plan/hooks/use-delete-installment-plan.hook.ts';
import { useTransactions } from '#/domain/transactions/transaction/hooks/use-transactions.hook.ts';
import { getCurrentMonthKey } from '#/shared/utils/get-current-month-key.util.ts';

/** What "Compra parcelada" reads (cards, expense categories and this month's transactions, to rank the categories) and writes (the plan, and its delete for the undo). */
export function useInstallmentCreateModel() {
  return {
    accounts: useAccounts(),
    categories: useCategories({ kind: 'expense', status: 'active' }),
    monthTransactions: useTransactions({ month: getCurrentMonthKey(new Date()) }),
    createPlan: useCreateInstallmentPlan(),
    deletePlan: useDeleteInstallmentPlan(),
  };
}

export type InstallmentCreateModel = ReturnType<typeof useInstallmentCreateModel>;
