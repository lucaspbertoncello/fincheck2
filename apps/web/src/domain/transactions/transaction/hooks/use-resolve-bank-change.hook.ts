import {
  resolveBankChangeRequestSchema,
  transactionDtoSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useResolveBankChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof resolveBankChangeRequestSchema>;
    }) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/transactions/${id}/bank-change/resolve`,
        bodySchema: resolveBankChangeRequestSchema,
        body,
        responseSchema: transactionDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
