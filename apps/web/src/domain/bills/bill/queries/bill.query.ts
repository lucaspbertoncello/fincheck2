import {
  billCounterpartyDtoSchema,
  billDtoSchema,
  billPaymentCandidateDtoSchema,
  listBillPaymentCandidatesQuerySchema,
  listBillsQuerySchema,
} from '@fincheck/shared/bills/bill/bill.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { billsKeys } from '#/domain/bills/cache/constants/bills-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const billQueries = {
  list: (query: ApiRequest.QueryInput<typeof listBillsQuerySchema> = {}) =>
    queryOptions({
      queryKey: billsKeys.list(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/bills',
          querySchema: listBillsQuerySchema,
          query,
          responseSchema: listResponseSchema(billDtoSchema),
          signal,
        }),
    }),
  counterparties: () =>
    queryOptions({
      queryKey: billsKeys.counterparties(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/bills/counterparties',
          responseSchema: listResponseSchema(billCounterpartyDtoSchema),
          signal,
        }),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: billsKeys.detail(id),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/bills/${id}`,
          responseSchema: billDtoSchema,
          signal,
        }),
    }),
  paymentCandidates: (id: string) =>
    queryOptions({
      queryKey: billsKeys.paymentCandidates(id),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/bills/${id}/payment-candidates`,
          responseSchema: listResponseSchema(billPaymentCandidateDtoSchema),
          signal,
        }),
    }),
  paymentCandidatesBy: (
    query: ApiRequest.QueryInput<typeof listBillPaymentCandidatesQuerySchema>,
  ) =>
    queryOptions({
      queryKey: billsKeys.paymentCandidatesBy(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/bills/payment-candidates',
          querySchema: listBillPaymentCandidatesQuerySchema,
          query,
          responseSchema: listResponseSchema(billPaymentCandidateDtoSchema),
          signal,
        }),
    }),
};
