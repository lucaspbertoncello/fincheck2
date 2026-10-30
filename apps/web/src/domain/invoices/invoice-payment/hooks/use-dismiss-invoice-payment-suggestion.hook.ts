import { dismissPaymentSuggestionRequestSchema } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { invoiceDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useDismissInvoicePaymentSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      month,
      body,
    }: {
      accountId: string;
      month: string;
      body: ApiRequest.BodyInput<typeof dismissPaymentSuggestionRequestSchema>;
    }) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/cards/${accountId}/invoices/${month}/payment-suggestion/dismiss`,
        bodySchema: dismissPaymentSuggestionRequestSchema,
        body,
        responseSchema: invoiceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
