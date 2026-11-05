import { useQuery } from '@tanstack/react-query';

import { subscriptionQueries } from '#/domain/recurrences/subscription/queries/subscription.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useSubscriptions(month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...subscriptionQueries.list(month), ...options });
}
