import {
  invoiceDtoSchema,
  updateInvoiceRequestSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      month,
      body,
    }: {
      accountId: string;
      month: string;
      body: ApiRequest.BodyInput<typeof updateInvoiceRequestSchema>;
    }) =>
      apiRequest({
        method: 'PATCH',
        path: apiPath`/cards/${accountId}/invoices/${month}`,
        bodySchema: updateInvoiceRequestSchema,
        body,
        responseSchema: invoiceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
