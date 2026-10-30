import { useQuery } from '@tanstack/react-query';

import { transactionQueries } from '#/domain/transactions/transaction/queries/transaction.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useTransaction(id: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...transactionQueries.detail(id), ...options });
}
