import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const monthSummaryQueries = {
  byMonth: (month: string) =>
    queryOptions({
      queryKey: dashboardKeys.monthSummary(month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/month-summary',
          querySchema: monthQuerySchema,
          query: { month },
          responseSchema: monthSummaryDtoSchema,
          signal,
        }),
    }),
};
