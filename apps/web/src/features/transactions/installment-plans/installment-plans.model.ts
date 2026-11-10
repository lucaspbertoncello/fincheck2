import { isMissingApiError } from '#/shared/api/is-missing-api-error.util.ts';
import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useDeleteInstallmentPlan } from '#/domain/transactions/installment-plan/hooks/use-delete-installment-plan.hook.ts';
import { useInstallmentPlans } from '#/domain/transactions/installment-plan/hooks/use-installment-plans.hook.ts';

/** What "Compras parceladas" reads (the card, its plans, the categories for the icons) and writes (the delete). */
export function useInstallmentPlansModel(cardId: string) {
  const card = useAccount(cardId);
  const plans = useInstallmentPlans({ accountId: cardId });
  const categories = useCategories({ status: 'all' });

  return {
    card: card.data,
    cardName: card.data?.name ?? '',
    plans: plans.data?.items ?? [],
    categories: categories.data?.items ?? [],
    isLoading: card.isPending || plans.isPending || categories.isPending,
    // The card of the address is not there (404), the id is not even an id (400), or the account is
    // not a credit card: the same "cartão inexistente".
    isMissing:
      isMissingApiError(card.error) ||
      isMissingApiError(plans.error) ||
      (card.data !== undefined && card.data.type !== 'credit_card'),
    isError: card.isError || plans.isError || categories.isError,
    retry: () => {
      void card.refetch();
      void plans.refetch();
      void categories.refetch();
    },
    deletePlan: useDeleteInstallmentPlan(),
  };
}
