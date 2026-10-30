import { useQuery } from '@tanstack/react-query';

import { monthSummaryQueries } from '#/domain/dashboard/month-summary/queries/month-summary.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useMonthSummary(month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...monthSummaryQueries.byMonth(month), ...options });
}
