import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useCreateAccount } from '#/domain/accounts/account/hooks/use-create-account.hook.ts';
import { useUpdateAccount } from '#/domain/accounts/account/hooks/use-update-account.hook.ts';
import { useCreateConnection } from '#/domain/sync/connection/hooks/use-create-connection.hook.ts';
import { useSyncSettings } from '#/domain/sync/settings/hooks/use-sync-settings.hook.ts';

/**
 * What "Conectar conta" needs: whether the Pluggy keys exist, the two ways to add an account, and,
 * when it opens to edit, the account being edited and the update.
 */
export function useConnectAccountModel(isCreating: boolean, editId: string | undefined) {
  const settings = useSyncSettings({ enabled: isCreating });
  const editing = useAccount(editId ?? '', { enabled: Boolean(editId) });

  return {
    isLoadingSettings: settings.isPending,
    isConfigured: settings.data?.configured ?? false,
    editAccount: editing.data,
    isLoadingEdit: Boolean(editId) && editing.isPending,
    isEditError: Boolean(editId) && editing.isError,
    retryEdit: () => editing.refetch(),
    createConnection: useCreateConnection(),
    createAccount: useCreateAccount(),
    updateAccount: useUpdateAccount(),
  };
}
