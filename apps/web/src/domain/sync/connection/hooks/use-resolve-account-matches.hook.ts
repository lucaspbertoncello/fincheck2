import {
  connectionDtoSchema,
  resolveAccountMatchesRequestSchema,
} from '@fincheck/shared/sync/connection/connection.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { syncKeys } from '#/domain/sync/cache/constants/sync-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useResolveAccountMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof resolveAccountMatchesRequestSchema>;
    }) =>
      apiRequest({
        method: 'PUT',
        path: apiPath`/sync/connections/${id}/account-matches`,
        bodySchema: resolveAccountMatchesRequestSchema,
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
