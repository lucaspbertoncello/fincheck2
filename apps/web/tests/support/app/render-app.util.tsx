import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';

import { createAppRouter } from '#/router/create-router.util.tsx';
import { AppProviders } from '#/shared/providers/app-providers.component.tsx';

/** Renders the whole app (providers, router, shell) at a URL. Without matchMedia it is the mobile layout. */
export function renderApp(url = '/') {
  window.scrollTo = () => undefined; // jsdom does not implement it; the router restores scroll
  window.history.replaceState({}, '', url);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(queryClient);
  return render(<AppProviders queryClient={queryClient} router={router} />);
}
