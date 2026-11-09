import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { accountQueries } from '#/domain/accounts/account/queries/account.query.ts';
import { accountsKeys } from '#/domain/accounts/cache/constants/accounts-keys.constant.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

/**
 * One account. While the request runs, the copy the cached lists already hold stands in for it,
 * so a screen that opens from the list shows the account at once; the answer replaces it.
 */
export function useAccount(id: string, options: ApiRequest.ReadOptions = {}) {
  const queryClient = useQueryClient();

  return useQuery({
    ...accountQueries.detail(id),
    placeholderData: () =>
      queryClient
        .getQueriesData<{ items: Account.Dto[] }>({ queryKey: accountsKeys.listAll })
        .flatMap(([, list]) => list?.items ?? [])
        .find((account) => account.id === id),
    ...options,
  });
}
