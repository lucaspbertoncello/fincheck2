import {
  listTransactionsQuerySchema,
  listTransactionsResponseSchema,
  transactionDtoSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { transactionsKeys } from '#/domain/transactions/cache/constants/transactions-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const transactionQueries = {
  list: (query: ApiRequest.QueryInput<typeof listTransactionsQuerySchema>) =>
    queryOptions({
      queryKey: transactionsKeys.list(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/transactions',
          querySchema: listTransactionsQuerySchema,
          query,
          responseSchema: listTransactionsResponseSchema,
          signal,
        }),
    }),
  // The list without a month, read page by page with the opaque cursor (`nextCursor` is null at the end).
  infinite: (query: Omit<ApiRequest.QueryInput<typeof listTransactionsQuerySchema>, 'cursor'>) =>
    infiniteQueryOptions({
      queryKey: transactionsKeys.infinite(query),
      initialPageParam: undefined as string | undefined,
      queryFn: ({ signal, pageParam }) =>
        apiRequest({
          method: 'GET',
          path: '/transactions',
          querySchema: listTransactionsQuerySchema,
          query: { ...query, cursor: pageParam },
          responseSchema: listTransactionsResponseSchema,
          signal,
        }),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: transactionsKeys.detail(id),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/transactions/${id}`,
          responseSchema: transactionDtoSchema,
          signal,
        }),
    }),
};
