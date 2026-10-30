import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { createBillPaymentRequestSchema } from '@fincheck/shared/bills/bill-payment/bill-payment.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateBillPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof createBillPaymentRequestSchema>;
    }) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/bills/${id}/payments`,
        bodySchema: createBillPaymentRequestSchema,
        body,
        responseSchema: billDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
