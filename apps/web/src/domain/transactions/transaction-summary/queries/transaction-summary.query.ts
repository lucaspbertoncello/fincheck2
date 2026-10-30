import { queryOptions } from '@tanstack/react-query';
import {
  transactionSummaryDtoSchema,
  transactionSummaryQuerySchema,
} from '@fincheck/shared/transactions/transaction-summary/transaction-summary.schema.ts';

import { transactionsKeys } from '#/domain/transactions/cache/constants/transactions-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const transactionSummaryQueries = {
  byMonth: (month: string) =>
    queryOptions({
      queryKey: transactionsKeys.summary(month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/transactions/summary',
          querySchema: transactionSummaryQuerySchema,
          query: { month },
          responseSchema: transactionSummaryDtoSchema,
          signal,
        }),
    }),
};
