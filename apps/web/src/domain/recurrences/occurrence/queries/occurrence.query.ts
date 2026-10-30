import {
  listOccurrencesQuerySchema,
  occurrenceCandidateDtoSchema,
  occurrenceDtoSchema,
} from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { recurrencesKeys } from '#/domain/recurrences/cache/constants/recurrences-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const occurrenceQueries = {
  list: (month: string, needsAttention?: boolean) =>
    queryOptions({
      queryKey: recurrencesKeys.occurrences({ month, needsAttention }),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/occurrences',
          querySchema: listOccurrencesQuerySchema,
          query: { month, needsAttention },
          responseSchema: listResponseSchema(occurrenceDtoSchema),
          signal,
        }),
    }),
  candidates: (id: string) =>
    queryOptions({
      queryKey: recurrencesKeys.occurrenceCandidates(id),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/occurrences/${id}/candidates`,
          responseSchema: listResponseSchema(occurrenceCandidateDtoSchema),
          signal,
        }),
    }),
};
