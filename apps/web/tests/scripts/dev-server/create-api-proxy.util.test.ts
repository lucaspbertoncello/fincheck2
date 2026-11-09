import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

import { createApiProxy } from '#scripts/dev-server/create-api-proxy.util.ts';

describe('createApiProxy', () => {
  it('targets API_PORT and drops the /api prefix', () => {
    const proxy = createApiProxy({ API_PORT: '3340' });

    expect(proxy.target).toBe('http://127.0.0.1:3340');
    expect(proxy.rewrite?.('/api/accounts?x=1')).toBe('/accounts?x=1');
  });

  it('sets the token header on the forwarded request', () => {
    const proxy = createApiProxy({ LOCAL_TOKEN: 'a-local-token-0123456789' });
    const server = new EventEmitter();
    proxy.configure?.(server as never, proxy);
    const setHeader = vi.fn();

    server.emit('proxyReq', { setHeader });

    expect(setHeader).toHaveBeenCalledWith('X-Fincheck-Token', 'a-local-token-0123456789');
  });
});
