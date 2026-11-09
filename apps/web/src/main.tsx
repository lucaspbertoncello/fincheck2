import '@fincheck/ui/styles/fincheck.css';

import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAppRouter } from '#/router/create-router.util.tsx';
import { ignoreSkippedViewTransitions } from '#/router/view-transition/ignore-skipped-view-transitions.util.ts';
import { shouldRetryQuery } from '#/shared/api/should-retry-query.util.ts';
import { AppProviders } from '#/shared/providers/app-providers.component.tsx';

ignoreSkippedViewTransitions();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetryQuery } } });
const router = createAppRouter(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient} router={router} />
  </StrictMode>,
);
