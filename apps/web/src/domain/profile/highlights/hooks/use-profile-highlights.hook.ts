import { useQuery } from '@tanstack/react-query';

import { profileHighlightsQueries } from '#/domain/profile/highlights/queries/profile-highlights.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useProfileHighlights(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...profileHighlightsQueries.current(), ...options });
}
