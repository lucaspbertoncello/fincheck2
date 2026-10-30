import {
  accountDtoSchema,
  updateAccountRequestSchema,
} from '@fincheck/shared/accounts/account/account.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof updateAccountRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/accounts/${id}`,
        bodySchema: updateAccountRequestSchema,
        body,
        responseSchema: accountDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
