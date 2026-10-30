import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { queryOptions } from '@tanstack/react-query';
import { spendingCurveDtoSchema } from '@fincheck/shared/dashboard/spending-curve/spending-curve.schema.ts';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const spendingCurveQueries = {
  byMonth: (month: string) =>
    queryOptions({
      queryKey: dashboardKeys.spendingCurve(month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/spending-curve',
          querySchema: monthQuerySchema,
          query: { month },
          responseSchema: spendingCurveDtoSchema,
          signal,
        }),
    }),
};
