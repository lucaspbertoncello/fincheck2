import { useConnections } from '#/domain/sync/connection/hooks/use-connections.hook.ts';

/** The screen reads the connections only to write their summary in the side menu. */
export function useSettingsModel() {
  return { connections: useConnections() };
}
