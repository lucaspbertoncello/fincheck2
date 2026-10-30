import {
  connectionDtoSchema,
  createConnectionRequestSchema,
} from '@fincheck/shared/sync/connection/connection.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { syncKeys } from '#/domain/sync/cache/constants/sync-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createConnectionRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/sync/connections',
        bodySchema: createConnectionRequestSchema,
        body,
        responseSchema: connectionDtoSchema,
      }),
    onSuccess: () =>
      Promise.all([
        invalidateLedger(queryClient),
        queryClient.invalidateQueries({ queryKey: syncKeys.all }),
      ]),
  });
}
