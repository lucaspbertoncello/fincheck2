import { useQuery } from '@tanstack/react-query';

import { categoryBreakdownQueries } from '#/domain/dashboard/category-breakdown/queries/category-breakdown.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/** The categories of a free period, or of all the history when `range` is empty. */
export function useCategoryBreakdownPeriod(
  range: { from?: string; to?: string },
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...categoryBreakdownQueries.byPeriod(range), ...options });
}
