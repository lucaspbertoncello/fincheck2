import { useQuery } from '@tanstack/react-query';

import { recurrenceQueries } from '#/domain/recurrences/recurrence/queries/recurrence.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useRecurrences(
  month: string,
  includeArchived: boolean = false,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...recurrenceQueries.list(month, includeArchived), ...options });
}
