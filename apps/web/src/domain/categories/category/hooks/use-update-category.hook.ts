import {
  categoryDtoSchema,
  updateCategoryRequestSchema,
} from '@fincheck/shared/categories/category/category.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateCatalog } from '#/domain/cache/catalog/services/invalidate-catalog.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof updateCategoryRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/categories/${id}`,
        bodySchema: updateCategoryRequestSchema,
        body,
        responseSchema: categoryDtoSchema,
      }),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
