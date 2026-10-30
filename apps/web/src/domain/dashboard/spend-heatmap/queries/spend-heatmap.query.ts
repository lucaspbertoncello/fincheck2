import { queryOptions } from '@tanstack/react-query';
import {
  getSpendHeatmapQuerySchema,
  spendHeatmapDtoSchema,
} from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const spendHeatmapQueries = {
  // `until` is the last day of the map; without it the API uses today.
  until: (until?: string) =>
    queryOptions({
      queryKey: dashboardKeys.spendHeatmap(until ?? 'today'),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/spend-heatmap',
          querySchema: getSpendHeatmapQuerySchema,
          query: until ? { until } : {},
          responseSchema: spendHeatmapDtoSchema,
          signal,
        }),
    }),
};
