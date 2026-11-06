import { queryOptions } from '@tanstack/react-query';
import {
  getSpendHeatmapQuerySchema,
  spendHeatmapDtoSchema,
} from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';

import { dashboardKeys } from '#/domain/dashboard/cache/constants/dashboard-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const spendHeatmapQueries = {
  // A period (`from` and `to`, both included): a month or a year for the Mês | Ano of Perfil.
  range: (from: string, to: string) =>
    queryOptions({
      queryKey: dashboardKeys.spendHeatmap(`${from}..${to}`),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/dashboard/spend-heatmap',
          querySchema: getSpendHeatmapQuerySchema,
          query: { from, to },
          responseSchema: spendHeatmapDtoSchema,
          signal,
        }),
    }),
};
