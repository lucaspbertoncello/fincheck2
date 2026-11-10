import {
  installmentPlanDtoSchema,
  updateInstallmentPlanRequestSchema,
} from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

type UpdateInstallmentPlanInput = {
  id: string;
  body: ApiRequest.BodyInput<typeof updateInstallmentPlanRequestSchema>;
};

/** Edits a manual plan in place; the API recalculates its installments (the sum stays the total). */
export function useUpdateInstallmentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: UpdateInstallmentPlanInput) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/installment-plans/${id}`,
        bodySchema: updateInstallmentPlanRequestSchema,
        body,
        responseSchema: installmentPlanDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
