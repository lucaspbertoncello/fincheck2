import { useInfiniteQuery } from '@tanstack/react-query';

import { transactionQueries } from '#/domain/transactions/transaction/queries/transaction.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

type InfiniteQuery = Parameters<typeof transactionQueries.infinite>[0];

export function useInfiniteTransactions(
  query: InfiniteQuery,
  options: ApiRequest.ReadOptions = {},
) {
  return useInfiniteQuery({ ...transactionQueries.infinite(query), ...options });
}
