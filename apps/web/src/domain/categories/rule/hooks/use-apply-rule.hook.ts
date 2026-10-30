import { applyRuleResultSchema } from '@fincheck/shared/categories/rule/rule.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useApplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/rules/${id}/apply`,
        responseSchema: applyRuleResultSchema,
      }),
    onSuccess: () =>
      Promise.all([
        invalidateLedger(queryClient),
        queryClient.invalidateQueries({ queryKey: categoriesKeys.all }),
      ]),
  });
}
