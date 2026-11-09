import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import {
  createConnectionRequestSchema,
  resolveAccountMatchesRequestSchema,
} from '@fincheck/shared/sync/connection/connection.schema.ts';
import { Hono } from 'hono';

import type { DisconnectConnectionController } from '#/modules/sync/http/connection/disconnect-connection.controller.ts';
import type { ListConnectionsController } from '#/modules/sync/http/connection/list-connections.controller.ts';
import type { RegisterConnectionController } from '#/modules/sync/http/connection/register-connection.controller.ts';
import type { ResolveAccountMatchesController } from '#/modules/sync/http/connection/resolve-account-matches.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The banks connected in the Meu Pluggy (RF-SYN-002, BR-SYN-004): list, register (202, the first
// round goes on in the background), choose the account of a reconnection (202) and disconnect (204).
export function createConnectionRoute(controllers: {
  listConnections: ListConnectionsController;
  registerConnection: RegisterConnectionController;
  resolveAccountMatches: ResolveAccountMatchesController;
  disconnectConnection: DisconnectConnectionController;
}) {
  return new Hono()
    .get('/sync/connections', async (c) => c.json(await controllers.listConnections.handle(), 200))
    .post('/sync/connections', validateRequest('json', createConnectionRequestSchema), async (c) =>
      c.json(await controllers.registerConnection.handle({ body: c.req.valid('json') }), 202),
    )
    .put(
      '/sync/connections/:id/account-matches',
      validateRequest('param', idParamSchema),
      validateRequest('json', resolveAccountMatchesRequestSchema),
      async (c) =>
        c.json(
          await controllers.resolveAccountMatches.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          202,
        ),
    )
    .delete('/sync/connections/:id', validateRequest('param', idParamSchema), async (c) => {
      await controllers.disconnectConnection.handle({ params: c.req.valid('param') });

      return c.body(null, 204);
    });
}
