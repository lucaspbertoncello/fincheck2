import { useQuery } from '@tanstack/react-query';

import { spendHeatmapQueries } from '#/domain/dashboard/spend-heatmap/queries/spend-heatmap.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useSpendHeatmap(until?: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...spendHeatmapQueries.until(until), ...options });
}
