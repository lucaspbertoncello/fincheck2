import { useQuery } from '@tanstack/react-query';

import { connectionQueries } from '#/domain/sync/connection/queries/connection.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

// A round runs in the background: while a connection is fetching (first history or a run), the list
// is read again every few seconds until it ends.
const ROUND_POLL_MS = 3000;

export function useConnections(options: ApiRequest.ReadOptions = {}) {
  return useQuery({
    ...connectionQueries.list(),
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (connection) =>
          connection.status !== 'disconnected' &&
          (connection.history.status === 'running' || connection.lastRun?.status === 'running'),
      )
        ? ROUND_POLL_MS
        : false,
    ...options,
  });
}
