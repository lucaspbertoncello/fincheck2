import {
  getTimelineQuerySchema,
  timelineDtoSchema,
} from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const timelineQueries = {
  byMonth: (month: string, scope: 'all' | 'recurrences' = 'all') =>
    queryOptions({
      queryKey: dashboardKeys.timeline(month, scope),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/timeline',
          querySchema: getTimelineQuerySchema,
          query: { month, scope },
          responseSchema: timelineDtoSchema,
          signal,
        }),
    }),
};
