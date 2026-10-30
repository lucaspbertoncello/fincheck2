import { deletionImpactDtoSchema } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { accountsKeys } from '#/domain/accounts/cache/constants/accounts-keys.constant.ts';
import { apiPath } from '#/shared/api/api-path.util.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';

export const deletionImpactQueries = {
  byAccount: (id: string) =>
    queryOptions({
      queryKey: accountsKeys.deletionImpact(id),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: apiPath`/accounts/${id}/deletion-impact`,
          responseSchema: deletionImpactDtoSchema,
          signal,
        }),
    }),
};
