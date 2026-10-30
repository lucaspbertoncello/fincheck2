import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { dismissPaymentSuggestionRequestSchema } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useDismissBillPaymentSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof dismissPaymentSuggestionRequestSchema>;
    }) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/bills/${id}/payment-suggestion/dismiss`,
        bodySchema: dismissPaymentSuggestionRequestSchema,
        body,
        responseSchema: billDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
