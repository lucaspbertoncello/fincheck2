import { categoryDtoSchema } from '@fincheck/shared/categories/category/category.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateCatalog } from '#/domain/cache/catalog/services/invalidate-catalog.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useUnarchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/categories/${id}/unarchive`,
        responseSchema: categoryDtoSchema,
      }),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
