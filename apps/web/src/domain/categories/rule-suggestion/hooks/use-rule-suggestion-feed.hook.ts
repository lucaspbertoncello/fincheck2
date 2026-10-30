import { useQuery } from '@tanstack/react-query';

import { ruleSuggestionQueries } from '#/domain/categories/rule-suggestion/queries/rule-suggestion.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/** Every rule suggestion, with no transaction ids (`useRuleSuggestions` stays idle without ids). */
export function useRuleSuggestionFeed(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...ruleSuggestionQueries.feed(), ...options });
}
