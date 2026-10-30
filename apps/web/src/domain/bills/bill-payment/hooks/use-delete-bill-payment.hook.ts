import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useDeleteBillPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentId }: { id: string; paymentId: string }) =>
      apiRequest({ method: 'DELETE', path: apiPath`/bills/${id}/payments/${paymentId}` }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
