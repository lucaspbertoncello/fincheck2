import {
  accountDtoSchema,
  createAccountRequestSchema,
} from '@fincheck/shared/accounts/account/account.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createAccountRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/accounts',
        bodySchema: createAccountRequestSchema,
        body,
        responseSchema: accountDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
