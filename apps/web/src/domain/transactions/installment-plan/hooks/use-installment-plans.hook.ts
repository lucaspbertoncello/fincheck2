import type { listInstallmentPlansQuerySchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { installmentPlanQueries } from '#/domain/transactions/installment-plan/queries/installment-plan.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useInstallmentPlans(
  query: ApiRequest.QueryInput<typeof listInstallmentPlansQuerySchema> = {},
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...installmentPlanQueries.list(query), ...options });
}
