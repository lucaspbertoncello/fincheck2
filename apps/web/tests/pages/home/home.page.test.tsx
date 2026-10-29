import { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createAppRouter } from '#/router/create-router.util.tsx';
import { AppProviders } from '#/shared/providers/app-providers.component.tsx';

describe('HomePage', () => {
  it('shows the title, formatted money and the API health', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createAppRouter(queryClient);

    render(<AppProviders queryClient={queryClient} router={router} />);

    expect(await screen.findByRole('heading', { name: 'Fincheck' })).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s1\.234,56$/)).toBeInTheDocument();
    expect(await screen.findByText('API funcionando')).toBeInTheDocument();
  });
});
