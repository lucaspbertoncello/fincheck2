import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '#/domain/accounts/account/queries/account.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useAccount(id: string, options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...accountQueries.detail(id), ...options });
}
