import { backupStatsDtoSchema } from '@fincheck/shared/backup/backup-stats/backup-stats.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { backupKeys } from '#/domain/backup/cache/constants/backup-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const backupStatsQueries = {
  current: () =>
    queryOptions({
      queryKey: backupKeys.stats(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/backup/stats',
          responseSchema: backupStatsDtoSchema,
          signal,
        }),
    }),
};
