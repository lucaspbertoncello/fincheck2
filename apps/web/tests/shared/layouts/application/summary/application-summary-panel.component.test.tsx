import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { hideValuesStore } from '#/shared/stores/hide-values.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();
afterEach(() => {
  hideValuesStore.set(false);
  window.localStorage.clear();
});

describe('ApplicationSummaryPanel', () => {
  it('shows the Livre from the API on the Visão geral, with accounts, invoices and the review link', async () => {
    renderApp('/?month=2026-10');

    const panel = await screen.findByRole('region', { name: 'Livre até o fim do mês' });
    expect(await within(panel).findByText(/por dia nos próximos \d+ dias/)).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: 'Contas' })).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: 'Faturas abertas' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /Para revisar/ })).toHaveAttribute(
      'href',
      '/transactions/review?month=2026-10',
    );
  });

  it('opens the items of a composition line', async () => {
    renderApp('/');
    const panel = await screen.findByRole('region', { name: 'Livre até o fim do mês' });

    const balance = await within(panel).findByRole('button', { name: /Saldo nas contas/ });
    expect(balance).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(balance);

    await waitFor(() => expect(balance).toHaveAttribute('aria-expanded', 'true'));
  });

  it('is the compact card on the other screens, with the same data', async () => {
    renderApp('/recurrences');

    const panel = await screen.findByRole('region', { name: 'Livre até o fim do mês' });
    expect(await within(panel).findByText(/\/dia/)).toBeInTheDocument();
  });

  it('shows the error with a retry that brings the panel back', async () => {
    server.use(
      http.get('/api/dashboard/free-balance', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'boom' }, { status: 500 }),
      ),
    );
    renderApp('/');

    expect(await screen.findByText('Não deu para carregar o Livre.')).toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText(/por dia nos próximos/)).toBeInTheDocument();
  });

  it('does not show on Configurações', async () => {
    renderApp('/settings');
    await screen.findByRole('heading', { level: 1, name: 'Configurações' });

    expect(
      screen.queryByRole('region', { name: 'Livre até o fim do mês' }),
    ).not.toBeInTheDocument();
  });
});
