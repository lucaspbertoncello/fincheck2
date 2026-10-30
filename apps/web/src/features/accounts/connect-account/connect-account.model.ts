import { useCreateAccount } from '#/domain/accounts/account/hooks/use-create-account.hook.ts';
import { useCreateConnection } from '#/domain/sync/connection/hooks/use-create-connection.hook.ts';
import { useSyncSettings } from '#/domain/sync/settings/hooks/use-sync-settings.hook.ts';

/** What "Conectar conta" needs: whether the Pluggy keys exist, and the two ways to add an account. */
export function useConnectAccountModel(isOpen: boolean) {
  const settings = useSyncSettings({ enabled: isOpen });

  return {
    isLoadingSettings: settings.isPending,
    isConfigured: settings.data?.configured ?? false,
    createConnection: useCreateConnection(),
    createAccount: useCreateAccount(),
  };
}
