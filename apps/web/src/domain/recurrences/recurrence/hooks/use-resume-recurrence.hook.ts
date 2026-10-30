import { recurrenceDtoSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useResumeRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/recurrences/${id}/resume`,
        responseSchema: recurrenceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
