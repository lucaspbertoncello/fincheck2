import { useQuery } from '@tanstack/react-query';

import { ruleQueries } from '#/domain/categories/rule/queries/rule.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function useRules(options: ApiRequest.ReadOptions = {}) {
  return useQuery({ ...ruleQueries.list(), ...options });
}
