import { Hono } from 'hono';

import type { GetHealthController } from '#/modules/health/http/health/get-health.controller.ts';

export function createHealthRoute(getHealth: GetHealthController) {
  return new Hono().get('/health', async (c) => c.json(await getHealth.handle(), 200));
}
