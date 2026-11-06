import { useQuery } from '@tanstack/react-query';

import { backupStatsQueries } from '#/domain/backup/backup-stats/queries/backup-stats.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useBackupStats(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...backupStatsQueries.current(), ...options });
}
