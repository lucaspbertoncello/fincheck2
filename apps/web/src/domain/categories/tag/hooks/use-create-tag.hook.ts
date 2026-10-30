import {
  createTagRequestSchema,
  tagDtoSchema,
} from '@fincheck/shared/categories/tag/tag.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateCatalog } from '#/domain/cache/catalog/services/invalidate-catalog.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createTagRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/tags',
        bodySchema: createTagRequestSchema,
        body,
        responseSchema: tagDtoSchema,
      }),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
