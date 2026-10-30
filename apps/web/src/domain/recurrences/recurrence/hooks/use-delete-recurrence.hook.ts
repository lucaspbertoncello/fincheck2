import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useDeleteRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiRequest({ method: 'DELETE', path: apiPath`/recurrences/${id}` }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
