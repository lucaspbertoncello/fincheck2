import {
  accountDtoSchema,
  listAccountsQuerySchema,
} from '@fincheck/shared/accounts/account/account.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { accountsKeys } from '#/domain/accounts/cache/constants/accounts-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const accountQueries = {
  list: (query: ApiRequest.QueryInput<typeof listAccountsQuerySchema> = {}) =>
    queryOptions({
      queryKey: accountsKeys.list(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/accounts',
          querySchema: listAccountsQuerySchema,
          query,
          responseSchema: listResponseSchema(accountDtoSchema),
          signal,
        }),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: accountsKeys.detail(id),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/accounts/${id}`,
          responseSchema: accountDtoSchema,
          signal,
        }),
    }),
};
