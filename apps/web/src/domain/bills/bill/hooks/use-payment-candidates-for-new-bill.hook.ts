import type { listBillPaymentCandidatesQuerySchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { billQueries } from '#/domain/bills/bill/queries/bill.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function usePaymentCandidatesForNewBill(
  query: ApiRequest.QueryInput<typeof listBillPaymentCandidatesQuerySchema>,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...billQueries.paymentCandidatesBy(query), ...options });
}
