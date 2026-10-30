import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateInstallmentPlan } from '#/domain/transactions/installment-plan/hooks/use-create-installment-plan.hook.ts';
import { useDeleteInstallmentPlan } from '#/domain/transactions/installment-plan/hooks/use-delete-installment-plan.hook.ts';

/** What "Compra parcelada" reads (cards and expense categories) and writes (the plan, and its delete for the undo). */
export function useInstallmentCreateModel() {
  return {
    accounts: useAccounts(),
    categories: useCategories({ kind: 'expense', status: 'active' }),
    createPlan: useCreateInstallmentPlan(),
    deletePlan: useDeleteInstallmentPlan(),
  };
}

export type InstallmentCreateModel = ReturnType<typeof useInstallmentCreateModel>;
