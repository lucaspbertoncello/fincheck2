import { dismissPaymentSuggestionQuerySchema } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { invoiceDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useRestoreInvoicePaymentSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      month,
      transactionId,
    }: {
      accountId: string;
      month: string;
      transactionId: string;
    }) =>
      apiRequest({
        method: 'DELETE',
        path: apiPath`/cards/${accountId}/invoices/${month}/payment-suggestion/dismiss`,
        querySchema: dismissPaymentSuggestionQuerySchema,
        query: { transactionId },
        responseSchema: invoiceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
