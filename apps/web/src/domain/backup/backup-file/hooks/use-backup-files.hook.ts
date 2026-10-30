import { useQuery } from '@tanstack/react-query';

import { backupFileQueries } from '#/domain/backup/backup-file/queries/backup-file.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useBackupFiles(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...backupFileQueries.list(), ...options });
}
