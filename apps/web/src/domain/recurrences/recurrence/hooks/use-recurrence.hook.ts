import { useQuery } from '@tanstack/react-query';

import { recurrenceQueries } from '#/domain/recurrences/recurrence/queries/recurrence.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useRecurrence(id: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...recurrenceQueries.detail(id), ...options });
}
