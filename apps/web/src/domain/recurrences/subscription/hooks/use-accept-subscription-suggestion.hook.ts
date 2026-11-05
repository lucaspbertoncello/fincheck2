import {
  acceptSubscriptionSuggestionRequestSchema,
  acceptSubscriptionSuggestionResponseSchema,
} from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/** "Acompanhar": creates the recurrence the suggestion proposes; it then shows in Recorrências. */
export function useAcceptSubscriptionSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof acceptSubscriptionSuggestionRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/subscriptions/suggestions/accept',
        bodySchema: acceptSubscriptionSuggestionRequestSchema,
        body,
        responseSchema: acceptSubscriptionSuggestionResponseSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
