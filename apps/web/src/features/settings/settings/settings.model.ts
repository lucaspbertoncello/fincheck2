import { useConnections } from '#/domain/sync/connection/hooks/use-connections.hook.ts';

/** The screen only reads the connections to name the banks in the side menu. */
export function useSettingsModel() {
  return { connections: useConnections() };
}
