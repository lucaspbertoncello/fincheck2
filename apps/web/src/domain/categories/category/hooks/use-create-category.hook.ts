import {
  categoryDtoSchema,
  createCategoryRequestSchema,
} from '@fincheck/shared/categories/category/category.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateCatalog } from '#/domain/cache/catalog/services/invalidate-catalog.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createCategoryRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/categories',
        bodySchema: createCategoryRequestSchema,
        body,
        responseSchema: categoryDtoSchema,
      }),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
