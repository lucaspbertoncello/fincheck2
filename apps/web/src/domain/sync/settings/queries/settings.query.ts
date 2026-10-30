import { queryOptions } from '@tanstack/react-query';
import { syncSettingsDtoSchema } from '@fincheck/shared/sync/settings/settings.schema.ts';

import { syncKeys } from '#/domain/sync/cache/constants/sync-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const settingsQueries = {
  current: () =>
    queryOptions({
      queryKey: syncKeys.settings(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/sync/settings',
          responseSchema: syncSettingsDtoSchema,
          signal,
        }),
    }),
};
