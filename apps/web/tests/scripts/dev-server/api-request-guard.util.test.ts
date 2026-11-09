import { describe, expect, it, vi } from 'vitest';

import { apiRequestGuard } from '#scripts/dev-server/api-request-guard.util.ts';

type Middleware = (request: unknown, response: unknown, next: () => void) => void;

function run(url: string, headers: Record<string, string>) {
  let middleware: Middleware | undefined;
  const plugin = apiRequestGuard(5173);
  const configure = plugin.configureServer as (server: unknown) => void;
  configure({ middlewares: { use: (fn: Middleware) => (middleware = fn) } });
  const response = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  const next = vi.fn();
  middleware?.({ url, headers }, response, next);

  return { response, next };
}

describe('apiRequestGuard', () => {
  it('lets a same-origin /api request through', () => {
    const { next, response } = run('/api/accounts', {
      host: '127.0.0.1:5173',
      origin: 'http://127.0.0.1:5173',
    });

    expect(next).toHaveBeenCalled();
    expect(response.end).not.toHaveBeenCalled();
  });

  it('answers 403 to a strange Origin without reaching the proxy', () => {
    const { next, response } = run('/api/accounts', {
      host: '127.0.0.1:5173',
      origin: 'https://evil.example',
    });

    expect(response.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 403 to a strange Host', () => {
    expect(run('/api/accounts', { host: 'evil.example:5173' }).response.statusCode).toBe(403);
  });

  it('does not touch the app pages', () => {
    expect(run('/', { host: 'anything' }).next).toHaveBeenCalled();
  });
});
