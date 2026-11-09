import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { waitForHealthy } from '#/domain/health/health/services/wait-for-healthy.service.ts';
import { server } from '#mocks/setup/server.util.ts';

describe('waitForHealthy', () => {
  it('resolves true when /health answers ok', async () => {
    expect(await waitForHealthy({ intervalMs: 5, timeoutMs: 500 })).toBe(true);
  });

  it('keeps asking while the API is down and resolves once it is back', async () => {
    let calls = 0;
    server.use(
      http.get('/api/health', () => {
        calls += 1;
        return calls < 3
          ? new HttpResponse(null, { status: 503 })
          : HttpResponse.json({ status: 'ok', database: 'ok' });
      }),
    );

    expect(await waitForHealthy({ intervalMs: 5, timeoutMs: 2000 })).toBe(true);
    expect(calls).toBe(3);
  });

  it('keeps asking through a refused connection and a degraded answer until it is ok', async () => {
    let calls = 0;
    server.use(
      http.get('/api/health', () => {
        calls += 1;
        if (calls === 1) return HttpResponse.error();
        if (calls === 2) return HttpResponse.json({ status: 'degraded', database: 'unavailable' });
        return HttpResponse.json({ status: 'ok', database: 'ok' });
      }),
    );

    expect(await waitForHealthy({ intervalMs: 5, timeoutMs: 2000 })).toBe(true);
    expect(calls).toBe(3);
  });

  it('does not send the token: /health is open', async () => {
    let token: string | null = 'unset';
    server.use(
      http.get('/api/health', ({ request }) => {
        token = request.headers.get('X-Fincheck-Token');
        return HttpResponse.json({ status: 'ok', database: 'ok' });
      }),
    );

    await waitForHealthy({ intervalMs: 5, timeoutMs: 500 });

    expect(token).toBeNull();
  });

  it('gives up with false after the timeout', async () => {
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json({ status: 'degraded', database: 'unavailable' }),
      ),
    );

    expect(await waitForHealthy({ intervalMs: 5, timeoutMs: 40 })).toBe(false);
  });
});
