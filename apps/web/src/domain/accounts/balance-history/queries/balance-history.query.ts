import {
  balanceHistoryDtoSchema,
  balanceHistoryQuerySchema,
} from '@fincheck/shared/accounts/balance-history/balance-history.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { accountsKeys } from '#/domain/accounts/cache/constants/accounts-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const balanceHistoryQueries = {
  byMonth: (id: string, month: string) =>
    queryOptions({
      queryKey: accountsKeys.balanceHistory(id, month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/accounts/${id}/balance-history`,
          querySchema: balanceHistoryQuerySchema,
          query: { month },
          responseSchema: balanceHistoryDtoSchema,
          signal,
        }),
    }),
};
