import {
  createRecurrenceRequestSchema,
  createRecurrenceResponseSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createRecurrenceRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/recurrences',
        bodySchema: createRecurrenceRequestSchema,
        body,
        responseSchema: createRecurrenceResponseSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
