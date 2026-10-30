import { runDtoSchema } from '@fincheck/shared/sync/run/run.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { syncKeys } from '#/domain/sync/cache/constants/sync-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useStartConnectionRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/sync/connections/${connectionId}/runs`,
        responseSchema: runDtoSchema,
      }),
    onSuccess: () =>
      Promise.all([
        invalidateLedger(queryClient),
        queryClient.invalidateQueries({ queryKey: syncKeys.all }),
      ]),
  });
}
