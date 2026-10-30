import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { dismissPaymentSuggestionQuerySchema } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useRestoreBillPaymentSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, transactionId }: { id: string; transactionId: string }) =>
      apiRequest({
        method: 'DELETE',
        path: apiPath`/bills/${id}/payment-suggestion/dismiss`,
        querySchema: dismissPaymentSuggestionQuerySchema,
        query: { transactionId },
        responseSchema: billDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
