import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { useQueries } from '@tanstack/react-query';

import { transactionQueries } from '#/domain/transactions/transaction/queries/transaction.query.ts';

/**
 * Several transactions read by id, each through the same cache entry `useTransaction` uses. The
 * result has the ones that already came, by id; the rest show up as they load. An id that fails is
 * left out.
 */
export function useTransactionsByIds(ids: readonly string[]) {
  return useQueries({
    queries: ids.map((id) => transactionQueries.detail(id)),
    combine: (results) =>
      Object.fromEntries(
        results.flatMap((result) => (result.data ? [[result.data.id, result.data]] : [])),
      ) as Record<string, Transaction.Dto>,
  });
}
