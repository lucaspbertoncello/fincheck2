import {
  createTransactionRequestSchema,
  transactionDtoSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createTransactionRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/transactions',
        bodySchema: createTransactionRequestSchema,
        body,
        responseSchema: transactionDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
