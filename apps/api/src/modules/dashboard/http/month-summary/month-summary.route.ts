import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { Hono } from 'hono';

import type { GetMonthSummaryController } from '#/modules/dashboard/http/month-summary/get-month-summary.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The three cards of the Visão geral and the line "Faltam N dias".
export function createMonthSummaryRoute(controllers: {
  getMonthSummary: GetMonthSummaryController;
}) {
  return new Hono().get(
    '/dashboard/month-summary',
    validateRequest('query', monthQuerySchema),
    async (c) =>
      c.json(await controllers.getMonthSummary.handle({ query: c.req.valid('query') }), 200),
  );
}
