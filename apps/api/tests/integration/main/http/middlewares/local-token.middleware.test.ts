import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '#/main/http/create-app.util.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { TEST_LOCAL_TOKEN, createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

describe('local token middleware', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.destroy();
  });

  const bareApp = () => createApp({ db: database.db, localToken: TEST_LOCAL_TOKEN });

  it('answers 401 LOCAL_TOKEN_INVALID when the header is missing', async () => {
    const response = await bareApp().request('/anything');

    expect(response.status).toBe(401);
    expect(apiErrorSchema.parse(await response.json()).code).toBe('LOCAL_TOKEN_INVALID');
  });

  it('answers 401 LOCAL_TOKEN_INVALID when the token is wrong', async () => {
    const response = await bareApp().request('/anything', {
      headers: { [LOCAL_TOKEN_HEADER]: 'not-the-token' },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'LOCAL_TOKEN_INVALID' });
  });

  it('lets the right token through to the route (an unknown one is a 404)', async () => {
    const response = await createTestApp(database.db).request('/anything');

    expect(response.status).toBe(404);
  });

  it('accepts the header name in any case', async () => {
    const response = await bareApp().request('/anything', {
      headers: { 'x-fincheck-token': TEST_LOCAL_TOKEN },
    });

    expect(response.status).toBe(404);
  });

  it('keeps GET /health open, with no token', async () => {
    const response = await bareApp().request('/health');

    expect(response.status).toBe(200);
  });

  it('keeps HEAD /health open too', async () => {
    const response = await bareApp().request('/health', { method: 'HEAD' });

    expect(response.status).toBe(200);
  });

  it('answers 401 without a token on every registered route but GET and HEAD /health', async () => {
    const app = bareApp();
    const routes = app.routes.filter((route) => route.method !== 'ALL');
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const path = route.path.replace(/:[^/]+/g, 'x');
      const isHealth = route.method === 'GET' && path === '/health';
      const methods = route.method === 'GET' ? ['GET', 'HEAD'] : [route.method];
      for (const method of methods) {
        const response = await app.request(path, { method });
        expect(response.status, `${method} ${path}`).toBe(isHealth ? 200 : 401);
      }
    }
  });

  it('guards the other methods of /health', async () => {
    const response = await bareApp().request('/health', { method: 'POST' });

    expect(response.status).toBe(401);
  });
});
