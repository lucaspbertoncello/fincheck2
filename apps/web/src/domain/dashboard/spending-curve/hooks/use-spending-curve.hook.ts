import { useQuery } from '@tanstack/react-query';

import { spendingCurveQueries } from '#/domain/dashboard/spending-curve/queries/spending-curve.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useSpendingCurve(month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...spendingCurveQueries.byMonth(month), ...options });
}
