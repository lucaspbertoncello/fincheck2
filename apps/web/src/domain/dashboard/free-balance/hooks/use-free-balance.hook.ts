import { useQuery } from '@tanstack/react-query';

import { freeBalanceQueries } from '#/domain/dashboard/free-balance/queries/free-balance.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useFreeBalance(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...freeBalanceQueries.current(), ...options });
}
