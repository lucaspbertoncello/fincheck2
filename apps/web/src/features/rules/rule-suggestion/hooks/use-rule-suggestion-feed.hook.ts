import { ruleSuggestionDtoSchema } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

/**
 * Every rule suggestion, with no transaction ids (`GET /rule-suggestions` allows that; the domain
 * hook `useRuleSuggestions` only asks for the ones tied to given transactions and stays idle without
 * ids). PROVISIONAL: it belongs in `src/domain/categories/rule-suggestion/`, where the cache key
 * already lives, so the screen is not the one calling the API.
 */
export function useRuleSuggestionFeed() {
  return useQuery({
    queryKey: categoriesKeys.ruleSuggestionList('all'),
    queryFn: ({ signal }) =>
      apiRequest({
        method: 'GET',
        path: '/rule-suggestions',
        responseSchema: listResponseSchema(ruleSuggestionDtoSchema),
        signal,
      }),
  });
}
