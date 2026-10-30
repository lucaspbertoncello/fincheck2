import {
  restoreBackupRequestSchema,
  restoreBackupResponseSchema,
} from '@fincheck/shared/backup/backup-restore/backup-restore.schema.ts';
import { useMutation } from '@tanstack/react-query';

import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useRestoreBackup() {
  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof restoreBackupRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/backup/restore',
        bodySchema: restoreBackupRequestSchema,
        body,
        responseSchema: restoreBackupResponseSchema,
      }),
    // No invalidation: the API restarts with the restored database and the page reloads.
  });
}
