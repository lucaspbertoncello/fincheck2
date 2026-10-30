import {
  installmentPlanDtoSchema,
  listInstallmentPlansQuerySchema,
} from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { transactionsKeys } from '#/domain/transactions/cache/constants/transactions-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const installmentPlanQueries = {
  list: (query: ApiRequest.QueryInput<typeof listInstallmentPlansQuerySchema> = {}) =>
    queryOptions({
      queryKey: transactionsKeys.installmentPlans(query),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/installment-plans',
          querySchema: listInstallmentPlansQuerySchema,
          query,
          responseSchema: listResponseSchema(installmentPlanDtoSchema),
          signal,
        }),
    }),
};
