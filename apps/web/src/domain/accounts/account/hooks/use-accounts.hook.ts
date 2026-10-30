import type { listAccountsQuerySchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '#/domain/accounts/account/queries/account.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useAccounts(
  query: ApiRequest.QueryInput<typeof listAccountsQuerySchema> = {},
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...accountQueries.list(query), ...options });
}
