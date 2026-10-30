import { useQuery } from '@tanstack/react-query';

import { recurrenceQueries } from '#/domain/recurrences/recurrence/queries/recurrence.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useRecurrenceSummary(month: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...recurrenceQueries.summary(month), ...options });
}
