import type { reviewQueueQuerySchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { reviewQueueQueries } from '#/domain/transactions/review-queue/queries/review-queue.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useReviewQueue(
  query: ApiRequest.QueryInput<typeof reviewQueueQuerySchema> = {},
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...reviewQueueQueries.list(query), ...options });
}
