import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import { updateBackupSettingsRequestSchema } from '@fincheck/shared/backup/backup-settings/backup-settings.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { backupKeys } from '#/domain/backup/cache/constants/backup-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateBackupSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof updateBackupSettingsRequestSchema>) =>
      apiRequest({
        method: 'PUT',
        path: '/backup/settings',
        bodySchema: updateBackupSettingsRequestSchema,
        body,
        responseSchema: backupStatusDtoSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: backupKeys.all }),
  });
}
