import { setupWorker } from 'msw/browser';

import { handlers } from '#mocks/setup/handlers.constant.ts';

export async function startBrowserWorker() {
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass' });
}
