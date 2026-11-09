import { categoryBreakdownQuerySchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { Hono } from 'hono';

import type { GetCategoryBreakdownController } from '#/modules/dashboard/http/category-breakdown/get-category-breakdown.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// Spending and income by category: a month, a free period or all the history.
export function createCategoryBreakdownRoute(controllers: {
  getCategoryBreakdown: GetCategoryBreakdownController;
}) {
  return new Hono().get(
    '/dashboard/categories',
    validateRequest('query', categoryBreakdownQuerySchema),
    async (c) =>
      c.json(await controllers.getCategoryBreakdown.handle({ query: c.req.valid('query') }), 200),
  );
}
