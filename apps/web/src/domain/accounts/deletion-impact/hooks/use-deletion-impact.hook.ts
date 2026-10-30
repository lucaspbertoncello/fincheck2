import { useQuery } from '@tanstack/react-query';

import { deletionImpactQueries } from '#/domain/accounts/deletion-impact/queries/deletion-impact.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useDeletionImpact(id: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...deletionImpactQueries.byAccount(id), ...options });
}
