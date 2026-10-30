import { billDtoSchema, updateBillRequestSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof updateBillRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/bills/${id}`,
        bodySchema: updateBillRequestSchema,
        body,
        responseSchema: billDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
