import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useCardInvoices } from '#/domain/invoices/invoice/hooks/use-card-invoices.hook.ts';

/** The projected invoices of one card (the API's default window: up to 3 months after the open one). */
export function useFutureInvoicesModel(cardId: string) {
  const card = useAccount(cardId);
  const invoices = useCardInvoices(cardId);

  return {
    isLoading: card.isPending || invoices.isPending,
    isError: card.isError || invoices.isError,
    cardName: card.data?.name ?? '',
    invoices: (invoices.data?.items ?? []).filter((invoice) => invoice.status === 'projected'),
    retry: () => {
      void card.refetch();
      void invoices.refetch();
    },
  };
}
