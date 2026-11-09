import { Hono } from 'hono';

import type { CreateConnectTokenController } from '#/modules/sync/http/connect-token/create-connect-token.controller.ts';

// The token the widget of the Pluggy opens with (RF-ACC-002, RF-SYN-001). It has no body.
export function createConnectTokenRoute(controllers: {
  createConnectToken: CreateConnectTokenController;
}) {
  return new Hono().post('/sync/connect-token', async (c) =>
    c.json(await controllers.createConnectToken.handle(), 200),
  );
}
