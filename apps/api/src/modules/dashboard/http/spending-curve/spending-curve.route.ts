import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { Hono } from 'hono';

import type { GetSpendingCurveController } from '#/modules/dashboard/http/spending-curve/get-spending-curve.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// "Gasto do mês" of the Visão geral: the accumulated line against the month before.
export function createSpendingCurveRoute(controllers: {
  getSpendingCurve: GetSpendingCurveController;
}) {
  return new Hono().get(
    '/dashboard/spending-curve',
    validateRequest('query', monthQuerySchema),
    async (c) =>
      c.json(await controllers.getSpendingCurve.handle({ query: c.req.valid('query') }), 200),
  );
}
