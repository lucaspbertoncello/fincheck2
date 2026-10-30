import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { listTagsQuerySchema, tagDtoSchema } from '@fincheck/shared/categories/tag/tag.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const tagQueries = {
  list: (query: ApiRequest.QueryInput<typeof listTagsQuerySchema> = {}) =>
    queryOptions({
      queryKey: categoriesKeys.tags(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/tags',
          querySchema: listTagsQuerySchema,
          query,
          responseSchema: listResponseSchema(tagDtoSchema),
          signal,
        }),
    }),
};
