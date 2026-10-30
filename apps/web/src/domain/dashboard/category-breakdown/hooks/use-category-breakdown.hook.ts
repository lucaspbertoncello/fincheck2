import { useQuery } from '@tanstack/react-query';

import { categoryBreakdownQueries } from '#/domain/dashboard/category-breakdown/queries/category-breakdown.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCategoryBreakdown(month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...categoryBreakdownQueries.byMonth(month), ...options });
}
