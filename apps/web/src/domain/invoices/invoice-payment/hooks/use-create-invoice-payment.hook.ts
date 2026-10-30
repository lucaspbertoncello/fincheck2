import { createInvoicePaymentRequestSchema } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.schema.ts';
import { invoiceDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useCreateInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      month,
      body,
    }: {
      accountId: string;
      month: string;
      body: ApiRequest.BodyInput<typeof createInvoicePaymentRequestSchema>;
    }) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/cards/${accountId}/invoices/${month}/payments`,
        bodySchema: createInvoicePaymentRequestSchema,
        body,
        responseSchema: invoiceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
