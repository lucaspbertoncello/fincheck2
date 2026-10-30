import type { listTagsQuerySchema } from '@fincheck/shared/categories/tag/tag.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { tagQueries } from '#/domain/categories/tag/queries/tag.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useTags(
  query: ApiRequest.QueryInput<typeof listTagsQuerySchema> = {},
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...tagQueries.list(query), ...options });
}
