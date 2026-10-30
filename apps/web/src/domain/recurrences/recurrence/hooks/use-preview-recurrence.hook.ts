import type { previewRecurrenceRequestSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { recurrenceQueries } from '#/domain/recurrences/recurrence/queries/recurrence.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function usePreviewRecurrence(
  body: ApiRequest.BodyInput<typeof previewRecurrenceRequestSchema>,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...recurrenceQueries.preview(body), ...options });
}
