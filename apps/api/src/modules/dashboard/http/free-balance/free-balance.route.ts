import { Hono } from 'hono';

import type { GetFreeBalanceController } from '#/modules/dashboard/http/free-balance/get-free-balance.controller.ts';

// The Livre: the painel of every screen but Configurações. No parameter: it is always of today.
export function createFreeBalanceRoute(controllers: { getFreeBalance: GetFreeBalanceController }) {
  return new Hono().get('/dashboard/free-balance', async (c) =>
    c.json(await controllers.getFreeBalance.handle(), 200),
  );
}
