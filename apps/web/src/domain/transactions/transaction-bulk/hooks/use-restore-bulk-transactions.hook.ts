import {
  restoreBulkRequestSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useRestoreBulkTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof restoreBulkRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/transactions/bulk/restore',
        bodySchema: restoreBulkRequestSchema,
        body,
        responseSchema: restoreBulkResultSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
