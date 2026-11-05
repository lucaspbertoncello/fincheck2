import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '#tests/support/app/render-app.util.tsx';

describe('Perfil on the phone', () => {
  it('keeps five items in the bottom bar and opens Perfil from the top bar', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    const bottom = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(bottom).getAllByRole('link')).toHaveLength(5);
    expect(within(bottom).queryByRole('link', { name: /Perfil/ })).toBeNull();
    const top = document.querySelector<HTMLElement>('.h-topbar-mobile')!;
    const profile = within(top).getByRole('link', { name: 'Perfil' });
    expect(profile).toHaveAttribute('href', '/profile');
    expect(within(top).getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('keeps the month in the link and marks it on the Perfil screen, with no tab marked', async () => {
    renderApp('/profile?month=2026-09');
    await screen.findByRole('heading', { level: 1, name: 'Perfil' });

    const profile = within(document.querySelector<HTMLElement>('.h-topbar-mobile')!).getByRole(
      'link',
      {
        name: 'Perfil',
      },
    );
    expect(profile).toHaveAttribute('aria-current', 'page');
    expect(profile.getAttribute('href')).toContain('month=2026-09');
    const bottom = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(bottom).queryByRole('link', { current: 'page' })).toBeNull();
  });

  it('shows the compact balance card under the header, as the other screens do', async () => {
    renderApp('/profile');
    await screen.findByRole('heading', { level: 1, name: 'Perfil' });

    expect(await screen.findByRole('region', { name: 'Saldo em contas' })).toBeInTheDocument();
  });

  it('has a "+" that adds an income source through the recurrence modal', async () => {
    renderApp('/profile');
    await screen.findByRole('heading', { level: 1, name: 'Perfil' });

    fireEvent.click(await screen.findByRole('button', { name: 'Nova fonte de renda' }));

    await waitFor(() => expect(window.location.pathname).toBe('/recurrences'));
    expect(window.location.search).toContain('new=recurrence');
  });
});
