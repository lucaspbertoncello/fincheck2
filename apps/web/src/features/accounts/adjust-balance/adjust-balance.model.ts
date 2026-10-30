import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useAdjustBalance } from '#/domain/accounts/balance-adjustment/hooks/use-adjust-balance.hook.ts';

/** The account being adjusted and the adjustment itself (`POST /accounts/:id/balance-adjustments`). */
export function useAdjustBalanceModel(accountId: string | undefined) {
  const account = useAccount(accountId ?? '', { enabled: Boolean(accountId) });

  return {
    account: account.data,
    isLoading: Boolean(accountId) && account.isPending,
    adjust: useAdjustBalance(),
  };
}
