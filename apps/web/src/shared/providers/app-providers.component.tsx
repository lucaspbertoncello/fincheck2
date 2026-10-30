import { ToastProvider } from '@fincheck/ui';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import type { createAppRouter } from '#/router/create-router.util.tsx';
import { useFollowSystemTheme } from '#/shared/hooks/use-follow-system-theme.hook.ts';
import { MoneyVisibilityProvider } from '#/shared/providers/money-visibility-provider.component.tsx';

type AppProvidersProps = {
  queryClient: QueryClient;
  router: ReturnType<typeof createAppRouter>;
};

export function AppProviders({ queryClient, router }: AppProvidersProps) {
  useFollowSystemTheme();

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
