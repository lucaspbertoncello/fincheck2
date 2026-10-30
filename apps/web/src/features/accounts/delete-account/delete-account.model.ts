import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useDeleteAccount } from '#/domain/accounts/account/hooks/use-delete-account.hook.ts';
import { useDeletionImpact } from '#/domain/accounts/deletion-impact/hooks/use-deletion-impact.hook.ts';

/** The account to delete, what the delete takes with it, and the delete itself. */
export function useDeleteAccountModel(accountId: string | undefined) {
  const enabled = Boolean(accountId);
  const account = useAccount(accountId ?? '', { enabled });
  const impact = useDeletionImpact(accountId ?? '', { enabled });

  return {
    account: account.data,
    impact: impact.data,
    isLoadingImpact: enabled && impact.isPending,
    isImpactError: impact.isError,
    retryImpact: () => void impact.refetch(),
    remove: useDeleteAccount(),
  };
}
