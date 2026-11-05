import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { spendHeatmapQueries } from '#/domain/dashboard/spend-heatmap/queries/spend-heatmap.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/**
 * The map of a period, both ends included (a month, or a year up to 31 December). While the next
 * period loads, the one on screen stays (`isPlaceholderData`), so the arrows never flash a skeleton.
 */
export function useSpendHeatmapRange(
  from: string,
  to: string,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({
    ...spendHeatmapQueries.range(from, to),
    placeholderData: keepPreviousData,
    ...options,
  });
}
