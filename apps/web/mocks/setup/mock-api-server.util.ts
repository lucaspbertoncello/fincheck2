import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { getResponse, type RequestHandler } from 'msw';
import type { Plugin, ViteDevServer } from 'vite';

import { sendFetchResponse } from '#mocks/setup/send-fetch-response.util.ts';
import { toFetchRequest } from '#mocks/setup/to-fetch-request.util.ts';

const HANDLERS_MODULE = '/mocks/setup/handlers.constant.ts';

// Vite plugin for `pnpm dev:mocks`: the dev server itself answers `/api/*` with the MSW handlers, so
// the app has data in any browser (no service worker) and the in-memory state lives in this process,
// surviving page reloads. The handlers load through `ssrLoadModule` to resolve `#mocks/` and friends.
export function mockApiServer(): Plugin {
  return {
    name: 'fincheck:mock-api-server',
    apply: 'serve',
    async configureServer(server) {
      await freezeClockFromEnvironment(server);
      // No `return () => ...`: the middleware runs before Vite's own, so nothing proxies `/api`.
      server.middlewares.use((incoming, outgoing, next) => {
        if (!incoming.url?.startsWith('/api/')) return next();

        void (async () => {
          const { handlers } = (await server.ssrLoadModule(HANDLERS_MODULE)) as {
            handlers: RequestHandler[];
          };
          const origin = `http://${incoming.headers.host ?? '127.0.0.1'}`;
          const request = await toFetchRequest(incoming, origin);
          const response =
            (await getResponse(handlers, request, { baseUrl: origin })) ??
            Response.json(
              apiErrorSchema.parse({
                code: 'NOT_FOUND',
                message: `Sem rota simulada para ${request.method} ${new URL(request.url).pathname}`,
              }),
              { status: 404 },
            );
          await sendFetchResponse(response, outgoing);
        })().catch(next);
      });
    },
  };
}

// FINCHECK_MOCK_NOW (an ISO instant) fixes the mock "today" before the seed loads; the capture script
// sets it so the screenshots show the same day the tests use. Without it the clock is the real one.
async function freezeClockFromEnvironment(server: ViteDevServer): Promise<void> {
  const now = process.env['FINCHECK_MOCK_NOW'];
  if (!now) return;
  const { setMockClock } = (await server.ssrLoadModule(
    '/mocks/support/dates/mock-clock.store.ts',
  )) as {
    setMockClock: (now: Date) => void;
  };
  setMockClock(new Date(now));
}
