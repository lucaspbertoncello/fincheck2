import { resolve } from 'node:path';
import type { ProxyOptions } from 'vite';

import { readApiEnv } from '#scripts/dev-server/read-api-env.util.ts';
import { readLocalToken } from '#scripts/dev-server/read-local-token.util.ts';

const API_FOLDER = resolve(import.meta.dirname, '../../../api');
const TOKEN_HEADER = 'X-Fincheck-Token';
const DEFAULT_API_PORT = '3333';

/**
 * The `/api` proxy of the dev server: forwards to the API (`API_PORT`, default 3333) without the
 * prefix and adds the local token, so the browser never holds it. The token is read on every
 * request: the API may start after Vite and write the `local-token` file then.
 */
export function createApiProxy(processEnv: NodeJS.ProcessEnv = process.env): ProxyOptions {
  const env = readApiEnv(API_FOLDER, processEnv);

  return {
    target: `http://127.0.0.1:${env['API_PORT'] || DEFAULT_API_PORT}`,
    rewrite: (path) => path.replace(/^\/api/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        const token = readLocalToken(API_FOLDER, env);
        if (token) proxyReq.setHeader(TOKEN_HEADER, token);
      });
    },
  };
}
