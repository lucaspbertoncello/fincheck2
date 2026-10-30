import { backupFileDtoSchema } from '@fincheck/shared/backup/backup-file/backup-file.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { backupKeys } from '#/domain/backup/cache/constants/backup-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const backupFileQueries = {
  list: () =>
    queryOptions({
      queryKey: backupKeys.files(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/backup/files',
          responseSchema: listResponseSchema(backupFileDtoSchema),
          signal,
        }),
    }),
};
