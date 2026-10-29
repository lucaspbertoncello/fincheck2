import type { ApiError } from '@fincheck/shared/common/api-error/api-error.type.ts';
import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { CheckDatabaseQuery } from '#/modules/health/application/health/check-database.query.ts';
import { GetHealthController } from '#/modules/health/http/health/get-health.controller.ts';
import { createHealthRoute } from '#/modules/health/http/health/health.route.ts';

// The composition root of the HTTP side: builds each module's controllers by hand (no container)
// and mounts their routes.
export function createApp({ db }: { db: Kysely<Database> }) {
  const getHealth = new GetHealthController(new CheckDatabaseQuery(db));

  return new Hono()
    .notFound((c) =>
      c.json<ApiError.Dto>({ code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' }, 404),
    )
    .onError(handleError)
    .route('/', createHealthRoute(getHealth));
}
