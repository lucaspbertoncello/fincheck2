import { useQuery } from '@tanstack/react-query';

import { timelineQueries } from '#/domain/dashboard/timeline/queries/timeline.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useTimeline(
  month: string,
  scope: 'all' | 'recurrences' = 'all',
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...timelineQueries.byMonth(month, scope), ...options });
}
