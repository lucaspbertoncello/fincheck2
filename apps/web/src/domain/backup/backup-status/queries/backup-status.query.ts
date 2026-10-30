import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { backupKeys } from '#/domain/backup/cache/constants/backup-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const backupStatusQueries = {
  current: () =>
    queryOptions({
      queryKey: backupKeys.status(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/backup',
          responseSchema: backupStatusDtoSchema,
          signal,
        }),
    }),
};
