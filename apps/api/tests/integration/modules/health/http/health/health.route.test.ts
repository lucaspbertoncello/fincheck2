import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { healthDtoSchema } from '@fincheck/shared/health/health/health.schema.ts';

import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

describe('GET /health', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('reports the API and the database as ok', async () => {
    const response = await createTestApp(database.db).request('/health');

    expect(response.status).toBe(200);
    expect(healthDtoSchema.parse(await response.json())).toEqual({ status: 'ok', database: 'ok' });
  });

  it('reports the database as unavailable when the connection is closed', async () => {
    const app = createTestApp(database.db);
    await database.db.destroy();

    const response = await app.request('/health');

    expect(await response.json()).toEqual({ status: 'degraded', database: 'unavailable' });
  });

  it('answers 404 with a JSON body for an unknown route', async () => {
    const response = await createTestApp(database.db).request('/unknown');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      code: 'ROUTE_NOT_FOUND',
      message: 'Rota não encontrada.',
    });
  });
});
