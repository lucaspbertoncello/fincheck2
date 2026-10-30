import {
  ruleDtoSchema,
  updateRuleRequestSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof updateRuleRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/rules/${id}`,
        bodySchema: updateRuleRequestSchema,
        body,
        responseSchema: ruleDtoSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKeys.all }),
  });
}
