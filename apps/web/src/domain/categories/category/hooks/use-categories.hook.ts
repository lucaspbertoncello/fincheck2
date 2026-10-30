import type { listCategoriesQuerySchema } from '@fincheck/shared/categories/category/category.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { categoryQueries } from '#/domain/categories/category/queries/category.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCategories(
  query: ApiRequest.QueryInput<typeof listCategoriesQuerySchema> = {},
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...categoryQueries.list(query), ...options });
}
