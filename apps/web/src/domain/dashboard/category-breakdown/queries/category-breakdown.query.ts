import { categoryBreakdownDtoSchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
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
};
