import { useQuery } from '@tanstack/react-query';

import { runQueries } from '#/domain/sync/run/queries/run.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useConnectionRuns(connectionId: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...runQueries.list(connectionId), ...options });
}
