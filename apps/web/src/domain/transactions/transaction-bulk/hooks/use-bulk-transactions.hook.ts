import {
  bulkTransactionsRequestSchema,
  bulkTransactionsResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useBulkTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof bulkTransactionsRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/transactions/bulk',
        bodySchema: bulkTransactionsRequestSchema,
        body,
        responseSchema: bulkTransactionsResultSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
