import {
  categoryBreakdownDtoSchema,
  categoryBreakdownQuerySchema,
} from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const categoryBreakdownQueries = {
  byMonth: (month: string) =>
    queryOptions({
      queryKey: dashboardKeys.categoryBreakdown(month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/categories',
          querySchema: monthQuerySchema,
          query: { month },
          responseSchema: categoryBreakdownDtoSchema,
          signal,
        }),
    }),
  // A free period (`from` and `to`, both ends included) or, with no range, all the history.
  byPeriod: (range: { from?: string; to?: string }) =>
    queryOptions({
      queryKey: dashboardKeys.categoryBreakdownPeriod(range.from ?? null, range.to ?? null),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/categories',
          querySchema: categoryBreakdownQuerySchema,
          query: range,
          responseSchema: categoryBreakdownDtoSchema,
          signal,
        }),
    }),
};
