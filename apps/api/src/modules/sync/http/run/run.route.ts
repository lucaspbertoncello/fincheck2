import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import { Hono } from 'hono';

import type { ListRunsController } from '#/modules/sync/http/run/list-runs.controller.ts';
import type { RetryRunController } from '#/modules/sync/http/run/retry-run.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The runs of a connection (RF-SYN-002, RF-SYN-004): the hours of the attempts, and "Tentar agora"
// (202, the round goes on in the background).
export function createRunRoute(controllers: {
  listRuns: ListRunsController;
  retryRun: RetryRunController;
}) {
  return new Hono()
    .get('/sync/connections/:id/runs', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.listRuns.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/sync/connections/:id/runs', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.retryRun.handle({ params: c.req.valid('param') }), 202),
    );
}
