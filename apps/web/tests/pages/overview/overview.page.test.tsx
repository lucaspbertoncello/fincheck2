import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { hideValuesStore } from '#/shared/stores/hide-values.store.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';

resetDatabaseBeforeEach();
afterEach(() => {
  hideValuesStore.set(false);
  window.localStorage.clear();
});

function failRoute(path: string) {
  return http.get(path, () =>
    HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'boom' }, { status: 500 }),
  );
}

describe('OverviewPage', () => {
  it('shows the month summary, the strip, the spending chart and the categories', async () => {
    renderApp('/');

    const cards = await screen.findByRole('region', { name: 'Resumo do mês' });
    expect(within(cards).getByText('Receitas')).toBeInTheDocument();
    expect(within(cards).getByText('Despesas')).toBeInTheDocument();
    expect(within(cards).getByText('Resultado do mês')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Até o fim do mês' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Gasto do mês' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Por categoria' })).toBeInTheDocument();
    expect(screen.getByText(/^Faltam/)).toBeInTheDocument();
  });

  it('opens the day chosen in the strip', async () => {
    renderApp('/');
    const strip = await screen.findByRole('listbox', { name: 'Até o fim do mês' });
    const options = within(strip).getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);

    const last = options.at(-1)!;
    fireEvent.click(last);

    await waitFor(() => expect(last).toHaveAttribute('aria-selected', 'true'));
  });

  it('links to A pagar e receber and to Transações by category with the month of the URL', async () => {
    renderApp('/?month=2026-10');

    const bills = await screen.findByRole('link', { name: 'A pagar e receber' });
    expect(bills.getAttribute('href')).toBe('/recurrences/bills?month=2026-10');

    fireEvent.click(await screen.findByRole('button', { name: /Por categoria/ }));
    const all = await screen.findByRole('link', { name: 'Ver todas' });
    expect(all.getAttribute('href')).toBe('/transactions?view=category&month=2026-10');
  });

  it('keeps the whole screen on the month of the URL and drops "Faltam" outside the current month', async () => {
    renderApp('/?month=2026-09');

    await screen.findByRole('region', { name: 'Resumo do mês' });
    expect(screen.queryByText(/^Faltam/)).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Mês' })).getByText('Setembro'),
    ).toBeInTheDocument();
  });

  it('says there is no spending in a month without data', async () => {
    renderApp('/?month=2020-01');

    fireEvent.click(await screen.findByRole('button', { name: /Por categoria/ }));
    expect(await screen.findByText('Nenhum gasto neste mês ainda.')).toBeInTheDocument();
  });

  it('shows the error of one block with a retry that loads it', async () => {
    server.use(failRoute('/api/dashboard/spending-curve'));
    renderApp('/');

    expect(await screen.findByText('Não deu para carregar o gasto do mês')).toBeInTheDocument();
    // The other blocks do not depend on it.
    expect(await screen.findByRole('region', { name: 'Resumo do mês' })).toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('region', { name: 'Gasto do mês' })).toBeInTheDocument();
  });

  it('hides every amount of the screen with the eye', async () => {
    renderApp('/');
    await screen.findByRole('region', { name: 'Resumo do mês' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Ocultar valores' })[0]!);

    await waitFor(() => expect(screen.getAllByText('valor oculto').length).toBeGreaterThan(3));
  });
});
