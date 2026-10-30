import {
  createInstallmentPlanRequestSchema,
  installmentPlanDtoSchema,
} from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateInstallmentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createInstallmentPlanRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/installment-plans',
        bodySchema: createInstallmentPlanRequestSchema,
        body,
        responseSchema: installmentPlanDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
