import { getTimelineQuerySchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { Hono } from 'hono';

import type { GetTimelineController } from '#/modules/dashboard/http/timeline/get-timeline.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// "Até o fim do mês" (the Livre by day) and the strip of Recorrentes.
export function createTimelineRoute(controllers: { getTimeline: GetTimelineController }) {
  return new Hono().get(
    '/dashboard/timeline',
    validateRequest('query', getTimelineQuerySchema),
    async (c) => c.json(await controllers.getTimeline.handle({ query: c.req.valid('query') }), 200),
  );
}
