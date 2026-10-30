import {
  listRecurrencesQuerySchema,
  previewRecurrenceRequestSchema,
  previewRecurrenceResponseSchema,
  recurrenceDetailDtoSchema,
  recurrenceListItemSchema,
  recurrenceSummarySchema,
  summaryRecurrencesQuerySchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { recurrencesKeys } from '#/domain/recurrences/cache/constants/recurrences-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const recurrenceQueries = {
  list: (month: string, includeArchived: boolean = false) =>
    queryOptions({
      queryKey: recurrencesKeys.list({ month, includeArchived }),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/recurrences',
          querySchema: listRecurrencesQuerySchema,
          query: { month, includeArchived },
          responseSchema: listResponseSchema(recurrenceListItemSchema),
          signal,
        }),
    }),
  summary: (month: string) =>
    queryOptions({
      queryKey: recurrencesKeys.summary(month),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/recurrences/summary',
          querySchema: summaryRecurrencesQuerySchema,
          query: { month },
          responseSchema: recurrenceSummarySchema,
          signal,
        }),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: recurrencesKeys.detail(id),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/recurrences/${id}`,
          responseSchema: recurrenceDetailDtoSchema,
          signal,
        }),
    }),
  preview: (body: ApiRequest.BodyInput<typeof previewRecurrenceRequestSchema>) =>
    queryOptions({
      queryKey: recurrencesKeys.preview(body),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'POST',
          path: '/recurrences/preview',
          bodySchema: previewRecurrenceRequestSchema,
          body,
          responseSchema: previewRecurrenceResponseSchema,
          signal,
        }),
    }),
};
