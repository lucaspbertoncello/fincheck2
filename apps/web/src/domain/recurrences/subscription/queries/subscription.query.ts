import {
  listSubscriptionsQuerySchema,
  listSubscriptionsResponseSchema,
} from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { recurrencesKeys } from '#/domain/recurrences/cache/constants/recurrences-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const subscriptionQueries = {
  list: (month: string) =>
    queryOptions({
      queryKey: recurrencesKeys.subscriptions(month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/subscriptions',
          querySchema: listSubscriptionsQuerySchema,
          query: { month },
          responseSchema: listSubscriptionsResponseSchema,
          signal,
        }),
    }),
};
