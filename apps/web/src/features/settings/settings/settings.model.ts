import { useProfile } from '#/domain/profile/profile/hooks/use-profile.hook.ts';
import { useConnections } from '#/domain/sync/connection/hooks/use-connections.hook.ts';

/** The screen reads the connections and the profile only to write their summary in the side menu. */
export function useSettingsModel() {
  return { connections: useConnections(), profile: useProfile() };
}
