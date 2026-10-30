import { queryOptions } from '@tanstack/react-query';
import {
  reviewQueueDtoSchema,
  reviewQueueQuerySchema,
} from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';

import { transactionsKeys } from '#/domain/transactions/cache/constants/transactions-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const reviewQueueQueries = {
  list: (query: ApiRequest.QueryInput<typeof reviewQueueQuerySchema> = {}) =>
    queryOptions({
      queryKey: transactionsKeys.reviewQueue(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/transactions/review-queue',
          querySchema: reviewQueueQuerySchema,
          query,
          responseSchema: reviewQueueDtoSchema,
          signal,
        }),
    }),
};
