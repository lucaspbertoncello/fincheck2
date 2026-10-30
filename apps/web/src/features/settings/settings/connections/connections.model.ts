import { useConnections } from '#/domain/sync/connection/hooks/use-connections.hook.ts';
import { useDeleteConnection } from '#/domain/sync/connection/hooks/use-delete-connection.hook.ts';
import { useResolveAccountMatches } from '#/domain/sync/connection/hooks/use-resolve-account-matches.hook.ts';
import { useSaveSyncSettings } from '#/domain/sync/settings/hooks/use-save-sync-settings.hook.ts';
import { useSyncSettings } from '#/domain/sync/settings/hooks/use-sync-settings.hook.ts';

/** Everything the "Conexões" section reads and changes. */
export function useConnectionsModel() {
  return {
    settings: useSyncSettings(),
    connections: useConnections(),
    disconnect: useDeleteConnection(),
    resolveMatches: useResolveAccountMatches(),
    saveSettings: useSaveSyncSettings(),
  };
}
