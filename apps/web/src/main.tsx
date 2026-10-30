import '@fincheck/ui/styles/fincheck.css';

import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAppRouter } from '#/router/create-router.util.tsx';
import { MocksFailedBanner } from '#/shared/components/feedback/mocks-failed-banner.component.tsx';
import { AppProviders } from '#/shared/providers/app-providers.component.tsx';

let mocksFailed = false;
if (import.meta.env.DEV && import.meta.env.MODE === 'mocks') {
  try {
    // The only allowed src -> mocks import: `pnpm dev:mocks` starts MSW before the first render.
    const { startBrowserWorker } = await import('#mocks/setup/browser-worker.util.ts');
    await startBrowserWorker();
  } catch (error) {
    // Some embedded browsers refuse the service worker: the app still opens, with a notice.
    console.error('MSW worker did not start', error);
    mocksFailed = true;
  }
}

const queryClient = new QueryClient();
const router = createAppRouter(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {mocksFailed ? <MocksFailedBanner /> : null}
    <AppProviders queryClient={queryClient} router={router} />
  </StrictMode>,
);
