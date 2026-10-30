import { useQuery } from '@tanstack/react-query';

import { profileQueries } from '#/domain/profile/profile/queries/profile.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useProfile(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...profileQueries.current(), ...options });
}
