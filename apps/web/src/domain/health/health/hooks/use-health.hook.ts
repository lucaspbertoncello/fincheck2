import { useQuery } from '@tanstack/react-query';

import { healthQuery } from '#/domain/health/health/queries/health.query.ts';

export function useHealth() {
  return useQuery(healthQuery);
}
