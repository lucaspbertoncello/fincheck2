import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import type { createAppRouter } from '#/router/create-router.util.tsx';

type AppProvidersProps = {
  queryClient: QueryClient;
  router: ReturnType<typeof createAppRouter>;
};

export function AppProviders({ queryClient, router }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
