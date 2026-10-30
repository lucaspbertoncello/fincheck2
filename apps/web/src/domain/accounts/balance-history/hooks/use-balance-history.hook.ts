import { useQuery } from '@tanstack/react-query';

import { balanceHistoryQueries } from '#/domain/accounts/balance-history/queries/balance-history.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useBalanceHistory(id: string, month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...balanceHistoryQueries.byMonth(id, month), ...options });
}
