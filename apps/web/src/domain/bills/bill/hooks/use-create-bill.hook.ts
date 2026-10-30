import { billDtoSchema, createBillRequestSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiRequest.BodyInput<typeof createBillRequestSchema>) =>
      apiRequest({
        method: 'POST',
        path: '/bills',
        bodySchema: createBillRequestSchema,
        body,
        responseSchema: billDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
