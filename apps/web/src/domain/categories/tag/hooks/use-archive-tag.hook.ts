import { tagDtoSchema } from '@fincheck/shared/categories/tag/tag.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateCatalog } from '#/domain/cache/catalog/services/invalidate-catalog.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useArchiveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/tags/${id}/archive`,
        responseSchema: tagDtoSchema,
      }),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
