import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  previewRuleRequestSchema,
  ruleDtoSchema,
  rulePreviewSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { queryOptions } from '@tanstack/react-query';

import { categoriesKeys } from '#/domain/categories/cache/constants/categories-keys.constant.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import type { ApiRequest } from '#/shared/api/api-request.type.ts';

export const ruleQueries = {
  list: () =>
    queryOptions({
      queryKey: categoriesKeys.rules(),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'GET',
          path: '/rules',
          responseSchema: listResponseSchema(ruleDtoSchema),
          signal,
        }),
    }),
  preview: (body: ApiRequest.BodyInput<typeof previewRuleRequestSchema>) =>
    queryOptions({
      queryKey: categoriesKeys.rulePreview(body),
      queryFn: ({ signal }) =>
        apiRequest({
          method: 'POST',
          path: '/rules/preview',
          bodySchema: previewRuleRequestSchema,
          body,
          responseSchema: rulePreviewSchema,
          signal,
        }),
    }),
};
