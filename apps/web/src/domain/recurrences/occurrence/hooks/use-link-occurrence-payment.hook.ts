import {
  linkOccurrencePaymentRequestSchema,
  occurrenceDtoSchema,
} from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useLinkOccurrencePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ApiRequest.BodyInput<typeof linkOccurrencePaymentRequestSchema>;
    }) =>
      apiRequest({
        method: 'POST',
        path: apiPath`/occurrences/${id}/payments`,
        bodySchema: linkOccurrencePaymentRequestSchema,
        body,
        responseSchema: occurrenceDtoSchema,
      }),
    onSuccess: () => invalidateLedger(queryClient),
  });
}
