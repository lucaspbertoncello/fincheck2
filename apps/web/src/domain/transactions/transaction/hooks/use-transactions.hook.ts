import type { listTransactionsQuerySchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { transactionQueries } from '#/domain/transactions/transaction/queries/transaction.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useTransactions(
  query: ApiRequest.QueryInput<typeof listTransactionsQuerySchema>,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...transactionQueries.list(query), ...options });
}
