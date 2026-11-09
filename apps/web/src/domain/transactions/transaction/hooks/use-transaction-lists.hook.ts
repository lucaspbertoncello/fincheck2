import type { listTransactionsQuerySchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { useQueries } from '@tanstack/react-query';

import { transactionQueries } from '#/domain/transactions/transaction/queries/transaction.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/** Several `GET /transactions` reads at once, one per query, in the same order; each result is its own. */
export function useTransactionLists(
  queries: readonly ApiRequest.QueryInput<typeof listTransactionsQuerySchema>[],
  options: ApiRequest.ReadOptions = {},
) {
  return useQueries({
    queries: queries.map((query) => ({ ...transactionQueries.list(query), ...options })),
  });
}
