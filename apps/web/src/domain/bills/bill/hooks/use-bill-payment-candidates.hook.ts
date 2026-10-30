import { useQuery } from '@tanstack/react-query';

import { billQueries } from '#/domain/bills/bill/queries/bill.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useBillPaymentCandidates(id: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...billQueries.paymentCandidates(id), ...options });
}
