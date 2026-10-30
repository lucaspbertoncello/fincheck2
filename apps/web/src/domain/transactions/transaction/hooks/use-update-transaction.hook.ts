import {
  transactionDtoSchema,
  updateTransactionRequestSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof updateTransactionRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/transactions/${id}`,
        bodySchema: updateTransactionRequestSchema,
        body,
        responseSchema: transactionDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
