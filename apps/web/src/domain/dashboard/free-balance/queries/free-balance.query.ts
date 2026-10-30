import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const freeBalanceQueries = {
  current: () =>
    queryOptions({
      queryKey: dashboardKeys.freeBalance(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/free-balance',
          responseSchema: freeBalanceDtoSchema,
          signal,
        }),
    }),
};
