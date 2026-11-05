import { useQuery } from '@tanstack/react-query';

import { categoryTrendQueries } from '#/domain/dashboard/category-trend/queries/category-trend.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/** The 12 monthly totals of a category (the bars of its page). */
export function useCategoryTrend(
  categoryId: string,
  until?: string,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...categoryTrendQueries.byCategory(categoryId, until), ...options });
}
