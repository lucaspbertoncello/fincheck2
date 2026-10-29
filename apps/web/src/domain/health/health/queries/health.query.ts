import { healthDtoSchema } from '@fincheck/shared/health/health/health.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '#/shared/api/api-client.service.ts';

export const healthQuery = queryOptions({
  queryKey: ['health'],
  queryFn: async () => {
    const response = await apiClient.health.$get();
    return healthDtoSchema.parse(await response.json());
  },
});
