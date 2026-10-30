import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useDeleteInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      month,
      paymentId,
    }: {
      accountId: string;
      month: string;
      paymentId: string;
    }) =>
      apiRequest({
        method: 'DELETE',
        path: apiPath`/cards/${accountId}/invoices/${month}/payments/${paymentId}`,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
