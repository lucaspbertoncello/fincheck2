import {
  saveSyncSettingsRequestSchema,
  syncSettingsDtoSchema,
} from '@fincheck/shared/sync/settings/settings.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { syncKeys } from '#/domain/sync/cache/constants/sync-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useSaveSyncSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof saveSyncSettingsRequestSchema>) =>
      apiRequest({
        method: 'PUT',
        path: '/sync/settings',
        bodySchema: saveSyncSettingsRequestSchema,
        body,
        responseSchema: syncSettingsDtoSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: syncKeys.all }),
  });
}
