import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export function useUnsettleOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/occurrences/${id}/unsettle`,
        responseSchema: occurrenceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
