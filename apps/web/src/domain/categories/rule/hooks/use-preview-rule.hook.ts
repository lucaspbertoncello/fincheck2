import type { previewRuleRequestSchema } from '@fincheck/shared/categories/rule/rule.schema.ts';
import { useQuery } from '@tanstack/react-query';

import { ruleQueries } from '#/domain/categories/rule/queries/rule.query.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export function usePreviewRule(
  body: ApiRequest.BodyInput<typeof previewRuleRequestSchema>,
  options: ApiRequest.ReadOptions = {},
) {
  return useQuery({ ...ruleQueries.preview(body), ...options });
}
