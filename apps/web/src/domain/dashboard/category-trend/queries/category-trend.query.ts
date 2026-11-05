import {
  categoryTrendDtoSchema,
  categoryTrendQuerySchema,
} from '@fincheck/shared/dashboard/category-trend/category-trend.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const categoryTrendQueries = {
  // The 12 months up to `until` (the current month when it is left out), oldest first.
  byCategory: (categoryId: string, until?: string) =>
    queryOptions({
      queryKey: dashboardKeys.categoryTrend(categoryId, until ?? null),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/dashboard/categories/${categoryId}/trend`,
          querySchema: categoryTrendQuerySchema,
          query: until ? { until } : {},
          responseSchema: categoryTrendDtoSchema,
          signal,
        }),
    }),
};
