import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

// A still screen asks the API for its data once and goes quiet. More than this many `/api` calls
// in the window below is a loop (an unstable query key, a refetch inside an effect).
const MAX_REQUESTS = 30;
const QUIET_WINDOW_MS = 1000;

const SCREENS = [
  '/',
  '/transactions',
  '/transactions?view=category',
  '/transactions/review',
  '/recurrences',
  '/recurrences/bills',
  '/recurrences/subscriptions',
  '/accounts',
  '/categories',
  '/categories/rules',
  '/profile',
  '/settings',
  '/settings/connections',
  '/settings/data',
  '/settings/appearance',
];

const listener = vi.fn();

afterEach(() => {
  server.events.removeAllListeners('request:start');
  listener.mockReset();
});

describe('requests of a still screen', () => {
  it.each(SCREENS)('%s settles instead of looping', async (path) => {
    const separator = path.includes('?') ? '&' : '?';
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.startsWith('/api/')) listener(request.url);
    });

    renderApp(`${path}${separator}month=${CURRENT_MONTH}`);
    await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    await new Promise((resolve) => setTimeout(resolve, QUIET_WINDOW_MS));
    const settled = listener.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, QUIET_WINDOW_MS));

    expect(settled).toBeGreaterThan(0);
    expect(settled).toBeLessThanOrEqual(MAX_REQUESTS);
    // Quiet: at most a polling tick (first sync watch) in the next window, never a burst.
    expect(listener.mock.calls.length - settled).toBeLessThanOrEqual(3);
  });
});
