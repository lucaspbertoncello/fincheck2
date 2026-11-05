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
  it('shows the balance from the API on the Visão geral, with the equation and the accounts', async () => {
    renderApp('/?month=2026-10');

    const panel = await screen.findByRole('region', { name: 'Saldo em contas' });
    expect(await within(panel).findByText('Sobra no fim do mês')).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: 'Contas' })).toBeInTheDocument();
    expect(within(panel).queryByRole('heading', { name: 'Faturas abertas' })).toBeNull();
    expect(within(panel).queryByRole('link', { name: /Para revisar/ })).toBeNull();
  });

  it('opens the items of a composition line', async () => {
    renderApp('/');
    const panel = await screen.findByRole('region', { name: 'Saldo em contas' });

    const balance = await within(panel).findByRole('button', { name: /A receber/ });
    expect(balance).toHaveAttribute('aria-expanded', 'false');
    // Closed, the items are not mounted: the line only has its (empty) Collapse.
    const items = document.getElementById(balance.getAttribute('aria-controls') ?? '');
    expect(items).toHaveAttribute('inert');
    expect(items).toHaveAttribute('aria-hidden', 'true');
    expect(items).toBeEmptyDOMElement();
    fireEvent.click(balance);

    await waitFor(() => expect(balance).toHaveAttribute('aria-expanded', 'true'));
    expect(items).not.toHaveAttribute('inert');
    expect(items).not.toBeEmptyDOMElement();
  });

  it('is the compact card on the other screens, with the same data', async () => {
    renderApp('/recurrences');

    const panel = await screen.findByRole('region', { name: 'Saldo em contas' });
    expect(
      await within(panel).findByRole('button', { name: 'Ocultar valores' }),
    ).toBeInTheDocument();
  });

  it('shows the error with a retry that brings the panel back', async () => {
    server.use(
      http.get('/api/dashboard/free-balance', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'boom' }, { status: 500 }),
      ),
    );
    renderApp('/');

    expect(await screen.findByText('Não deu para carregar o saldo.')).toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Sobra no fim do mês')).toBeInTheDocument();
  });

  it('does not show on Configurações', async () => {
    renderApp('/settings');
    await screen.findByRole('heading', { level: 1, name: 'Configurações' });

    expect(screen.queryByRole('region', { name: 'Saldo em contas' })).not.toBeInTheDocument();
  });
});
