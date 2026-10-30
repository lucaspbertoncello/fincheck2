import { useQuery } from '@tanstack/react-query';

import { transactionSummaryQueries } from '#/domain/transactions/transaction-summary/queries/transaction-summary.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useTransactionSummary(month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...transactionSummaryQueries.byMonth(month), ...options });
}
