import { useQuery } from '@tanstack/react-query';

import { backupStatusQueries } from '#/domain/backup/backup-status/queries/backup-status.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useBackupStatus(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...backupStatusQueries.current(), ...options });
}
