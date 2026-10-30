import { dismissRuleSuggestionRequestSchema } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useDismissRuleSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof dismissRuleSuggestionRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/rule-suggestions/dismiss',
        bodySchema: dismissRuleSuggestionRequestSchema,
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKeys.all }),
  });
}
