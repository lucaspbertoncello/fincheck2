import { connectionDtoSchema } from '@fincheck/shared/sync/connection/connection.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { syncKeys } from '#/domain/sync/cache/constants/sync-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const connectionQueries = {
  list: () =>
    queryOptions({
      queryKey: syncKeys.connections(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/sync/connections',
          responseSchema: listResponseSchema(connectionDtoSchema),
          signal,
        }),
    }),
};
