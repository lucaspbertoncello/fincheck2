import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  listRuleSuggestionsQuerySchema,
  ruleSuggestionDtoSchema,
} from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const ruleSuggestionQueries = {
  list: (transactionIds: string) =>
    queryOptions({
      queryKey: categoriesKeys.ruleSuggestionList(transactionIds),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/rule-suggestions',
          querySchema: listRuleSuggestionsQuerySchema,
          query: { transactionIds },
          responseSchema: listResponseSchema(ruleSuggestionDtoSchema),
          signal,
        }),
    }),
  // Every suggestion, with no transaction ids (`GET /rule-suggestions` allows that).
  feed: () =>
    queryOptions({
      queryKey: categoriesKeys.ruleSuggestionList('all'),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/rule-suggestions',
          responseSchema: listResponseSchema(ruleSuggestionDtoSchema),
          signal,
        }),
    }),
};
