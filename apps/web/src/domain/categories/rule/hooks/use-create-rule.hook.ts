import {
  createRuleRequestSchema,
  createRuleResultSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createRuleRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/rules',
        bodySchema: createRuleRequestSchema,
        body,
        responseSchema: createRuleResultSchema,
      }),
    onSuccess: () =>
      Promise.all([
        invalidateLedger(queryClient),
        queryClient.invalidateQueries({ queryKey: categoriesKeys.all }),
      ]),
  });
}
