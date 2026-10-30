/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { mockApiServer } from '#mocks/setup/mock-api-server.util.ts';

// Routing is code-based (src/router/routes/*.route.tsx): the file-based plugin wants
// `__root.tsx` / `index.tsx` names and would clash with our `<name>.route.tsx` rule.
// In `--mode mocks` the dev server answers `/api/*` itself (mockApiServer), so there is no proxy.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'mocks' ? [mockApiServer()] : [])],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy:
      mode === 'mocks'
        ? undefined
        : {
            '/api': {
              target: 'http://127.0.0.1:3333',
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
}));
