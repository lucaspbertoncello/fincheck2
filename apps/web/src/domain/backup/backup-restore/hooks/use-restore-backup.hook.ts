import {
  restoreBackupRequestSchema,
  restoreBackupResponseSchema,
} from '@fincheck/shared/backup/backup-restore/backup-restore.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof restoreBackupRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/backup/restore',
        bodySchema: restoreBackupRequestSchema,
        body,
        responseSchema: restoreBackupResponseSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
