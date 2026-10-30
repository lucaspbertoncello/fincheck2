import {
  adjustBalanceRequestSchema,
  adjustBalanceResponseSchema,
} from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useAdjustBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof adjustBalanceRequestSchema>;
    }) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/accounts/${id}/balance-adjustments`,
        bodySchema: adjustBalanceRequestSchema,
        body,
        responseSchema: adjustBalanceResponseSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
