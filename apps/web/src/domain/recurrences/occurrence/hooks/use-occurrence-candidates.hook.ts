import { useQuery } from '@tanstack/react-query';

import { occurrenceQueries } from '#/domain/recurrences/occurrence/queries/occurrence.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useOccurrenceCandidates(id: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...occurrenceQueries.candidates(id), ...options });
}
