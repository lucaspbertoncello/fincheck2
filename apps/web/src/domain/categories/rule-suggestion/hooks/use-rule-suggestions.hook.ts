import { useQuery } from '@tanstack/react-query';

import { ruleSuggestionQueries } from '#/domain/categories/rule-suggestion/queries/rule-suggestion.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

// The suggestions for the transactions on screen (the route takes 1 to 500 ids). Idle with no ids.
export function useRuleSuggestions(
  transactionIds: readonly string[],
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({
    ...ruleSuggestionQueries.list(transactionIds.join(',')),
    ...options,
    enabled: transactionIds.length > 0 && (options.enabled ?? true),
  });
}
