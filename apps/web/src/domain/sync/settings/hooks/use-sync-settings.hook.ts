import { useQuery } from '@tanstack/react-query';

import { settingsQueries } from '#/domain/sync/settings/queries/settings.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useSyncSettings(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...settingsQueries.current(), ...options });
}
