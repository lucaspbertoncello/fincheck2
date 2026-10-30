import {
  recurrenceDtoSchema,
  updateRecurrenceRequestSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof updateRecurrenceRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/recurrences/${id}`,
        bodySchema: updateRecurrenceRequestSchema,
        body,
        responseSchema: recurrenceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
