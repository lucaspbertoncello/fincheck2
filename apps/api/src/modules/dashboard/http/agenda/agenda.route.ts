import { getAgendaQuerySchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { Hono } from 'hono';

import type { GetAgendaController } from '#/modules/dashboard/http/agenda/get-agenda.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// Recorrentes > A pagar e receber, whole.
export function createAgendaRoute(controllers: { getAgenda: GetAgendaController }) {
  return new Hono().get('/agenda', validateRequest('query', getAgendaQuerySchema), async (c) =>
    c.json(await controllers.getAgenda.handle({ query: c.req.valid('query') }), 200),
  );
}
