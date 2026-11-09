import { getSpendHeatmapQuerySchema } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';
import { Hono } from 'hono';

import type { GetSpendHeatmapController } from '#/modules/dashboard/http/spend-heatmap/get-spend-heatmap.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The map of spending of the Perfil (BR-PRF-003): a square per day.
export function createSpendHeatmapRoute(controllers: {
  getSpendHeatmap: GetSpendHeatmapController;
}) {
  return new Hono().get(
    '/dashboard/spend-heatmap',
    validateRequest('query', getSpendHeatmapQuerySchema),
    async (c) =>
      c.json(await controllers.getSpendHeatmap.handle({ query: c.req.valid('query') }), 200),
  );
}
