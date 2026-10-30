import { useQuery } from '@tanstack/react-query';

import { connectionQueries } from '#/domain/sync/connection/queries/connection.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useConnections(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...connectionQueries.list(), ...options });
}
