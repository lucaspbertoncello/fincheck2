import { ToastProvider } from '@fincheck/ui';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import type { createAppRouter } from '#/router/create-router.util.tsx';
import { MoneyVisibilityProvider } from '#/shared/providers/money-visibility-provider.component.tsx';

type AppProvidersProps = {
  queryClient: QueryClient;
  router: ReturnType<typeof createAppRouter>;
};

export function AppProviders({ queryClient, router }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MoneyVisibilityProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </MoneyVisibilityProvider>
    </QueryClientProvider>
  );
}
