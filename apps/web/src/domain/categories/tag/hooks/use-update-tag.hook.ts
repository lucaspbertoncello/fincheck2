import {
  tagDtoSchema,
  updateTagRequestSchema,
} from '@fincheck/shared/categories/tag/tag.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateCatalog } from '#/domain/cache/catalog/services/invalidate-catalog.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof updateTagRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/tags/${id}`,
        bodySchema: updateTagRequestSchema,
        body,
        responseSchema: tagDtoSchema,
      }),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
