/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { mockApiServer } from '#mocks/setup/mock-api-server.util.ts';
import { apiRequestGuard } from '#scripts/dev-server/api-request-guard.util.ts';
import { createApiProxy } from '#scripts/dev-server/create-api-proxy.util.ts';

// Routing is code-based (src/router/routes/*.route.tsx): the file-based plugin wants
// `__root.tsx` / `index.tsx` names and would clash with our `<name>.route.tsx` rule.
// In `--mode mocks` the dev server answers `/api/*` itself (mockApiServer), so there is no proxy;
// otherwise `/api` goes to the API with the local token added (createApiProxy), after apiRequestGuard refuses
// any Host or Origin that is not the dev server itself (CSRF, DNS rebinding).
const WEB_PORT = 5173;

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'mocks' ? [mockApiServer()] : [apiRequestGuard(WEB_PORT)]),
  ],
  server: {
    host: '127.0.0.1',
    port: WEB_PORT,
    strictPort: true,
    proxy:
      mode === 'mocks'
        ? undefined
        : {
            '/api': createApiProxy(),
          },
  },
  test: {
    environment: 'jsdom',
    env: { TZ: 'America/Sao_Paulo' },
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/support/clock/freeze-clock.util.ts', './tests/setup.ts'],
  },
}));
