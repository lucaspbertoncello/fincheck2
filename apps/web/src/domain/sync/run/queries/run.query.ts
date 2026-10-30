import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';
import { runDtoSchema } from '@fincheck/shared/sync/run/run.schema.ts';

import { syncKeys } from '#/domain/sync/cache/constants/sync-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const runQueries = {
  list: (connectionId: string) =>
    queryOptions({
      queryKey: syncKeys.runs(connectionId),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/sync/connections/${connectionId}/runs`,
          responseSchema: listResponseSchema(runDtoSchema),
          signal,
        }),
    }),
};
