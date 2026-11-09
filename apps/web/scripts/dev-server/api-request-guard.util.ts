import type { Plugin } from 'vite';

import { isAllowedApiRequest } from '#scripts/dev-server/is-allowed-api-request.util.ts';

/** Vite plugin: answers 403 to a `/api` request that fails `isAllowedApiRequest`, before the proxy. */
export function apiRequestGuard(port: number): Plugin {
  return {
    name: 'fincheck:api-request-guard',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/api/')) return next();
        if (isAllowedApiRequest(request.headers, port)) return next();

        response.statusCode = 403;
        response.setHeader('Content-Type', 'application/json');
        response.end(
          JSON.stringify({ code: 'FORBIDDEN_ORIGIN', message: 'Pedido não permitido.' }),
        );
      });
    },
  };
}
