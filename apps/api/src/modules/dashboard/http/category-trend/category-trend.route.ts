import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import { categoryTrendQuerySchema } from '@fincheck/shared/dashboard/category-trend/category-trend.schema.ts';
import { Hono } from 'hono';

import type { GetCategoryTrendController } from '#/modules/dashboard/http/category-trend/get-category-trend.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The 12 months of a category, the bars of its page.
export function createCategoryTrendRoute(controllers: {
  getCategoryTrend: GetCategoryTrendController;
}) {
  return new Hono().get(
    '/dashboard/categories/:id/trend',
    validateRequest('param', idParamSchema),
    validateRequest('query', categoryTrendQuerySchema),
    async (c) =>
      c.json(
        await controllers.getCategoryTrend.handle({
          params: c.req.valid('param'),
          query: c.req.valid('query'),
        }),
        200,
      ),
  );
}
