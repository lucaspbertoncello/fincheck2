import type { listBillsQuerySchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { billQueries } from '#/domain/bills/bill/queries/bill.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useBills(
  query: ApiRequest.QueryInput<typeof listBillsQuerySchema> = {},
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...billQueries.list(query), ...options });
}
