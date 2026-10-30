import { backupRunDtoSchema } from '@fincheck/shared/backup/backup-run/backup-run.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { backupKeys } from '#/domain/backup/cache/constants/backup-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useStartBackupRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest({ method: 'POST', path: '/backup/runs', responseSchema: backupRunDtoSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: backupKeys.all }),
  });
}
