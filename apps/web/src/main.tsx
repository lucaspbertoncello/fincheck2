import '@fincheck/ui/styles/fincheck.css';

import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAppRouter } from '#/router/create-router.util.tsx';
import { AppProviders } from '#/shared/providers/app-providers.component.tsx';

const queryClient = new QueryClient();
const router = createAppRouter(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient} router={router} />
  </StrictMode>,
);
