import {
  categoryDtoSchema,
  listCategoriesQuerySchema,
} from '@fincheck/shared/categories/category/category.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const categoryQueries = {
  list: (query: ApiRequest.QueryInput<typeof listCategoriesQuerySchema> = {}) =>
    queryOptions({
      queryKey: categoriesKeys.categories(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/categories',
          querySchema: listCategoriesQuerySchema,
          query,
          responseSchema: listResponseSchema(categoryDtoSchema),
          signal,
        }),
    }),
};
