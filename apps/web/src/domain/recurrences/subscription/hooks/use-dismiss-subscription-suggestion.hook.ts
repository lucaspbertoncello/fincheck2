import { dismissSubscriptionSuggestionRequestSchema } from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { recurrencesKeys } from '#/domain/recurrences/cache/constants/recurrences-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/** "Agora não": hides the suggestion of that description for good. */
export function useDismissSubscriptionSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof dismissSubscriptionSuggestionRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/subscriptions/suggestions/dismiss',
        bodySchema: dismissSubscriptionSuggestionRequestSchema,
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recurrencesKeys.all }),
  });
}
