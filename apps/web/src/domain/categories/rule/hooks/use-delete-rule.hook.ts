import { useMutation, useQueryClient } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiRequest({ method: 'DELETE', path: apiPath`/rules/${id}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKeys.all }),
  });
}
