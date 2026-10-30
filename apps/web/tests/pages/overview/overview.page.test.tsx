import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows one day at a time in a slider, never the whole list of days', async () => {
    renderApp('/');
    const slider = await screen.findByRole('group', { name: 'Até o fim do mês' });

    expect(screen.queryByRole('listbox', { name: 'Até o fim do mês' })).not.toBeInTheDocument();
    expect(within(slider).getByText('Entra')).toBeInTheDocument();
    expect(within(slider).getByText('Sai')).toBeInTheDocument();
    expect(within(slider).getByText('Saldo projetado')).toBeInTheDocument();
    expect(screen.getByText(/^Dia \d+ de \d+$/)).toBeInTheDocument();
  });

  it('moves between days with the arrows and the keyboard', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const slider = await screen.findByRole('group', { name: 'Até o fim do mês' });
    const counter = () => screen.getByText(/^Dia \d+ de \d+$/).textContent ?? '';
    const total = counter().split(' de ')[1];
    expect(Number(total)).toBeGreaterThanOrEqual(2);

    slider.focus();
    await user.keyboard('{End}');
    await waitFor(() => expect(counter()).toBe(`Dia ${total} de ${total}`));
    expect(within(slider).getByRole('button', { name: 'Próximo dia' })).toBeDisabled();

    await user.keyboard('{Home}');
    await waitFor(() => expect(counter()).toBe(`Dia 1 de ${total}`));
    expect(within(slider).getByRole('button', { name: 'Dia anterior' })).toBeDisabled();

    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(counter()).toBe(`Dia 2 de ${total}`));
    await user.click(within(slider).getByRole('button', { name: 'Dia anterior' }));
    await waitFor(() => expect(counter()).toBe(`Dia 1 de ${total}`));
    await user.click(within(slider).getByRole('button', { name: 'Próximo dia' }));
    await waitFor(() => expect(counter()).toBe(`Dia 2 de ${total}`));
  });

  it('switches to the weeks, keeps the view in the URL and opens a week in the Dia view', async () => {
    const user = userEvent.setup();
    renderApp('/?month=2026-10');
    await screen.findByRole('group', { name: 'Até o fim do mês' });

    await user.click(screen.getByRole('radio', { name: 'Semana' }));

    const weeks = await screen.findByRole('list', { name: /^Semanas/ });
    expect(window.location.search).toContain('strip=week');
    expect(screen.queryByRole('group', { name: 'Até o fim do mês' })).not.toBeInTheDocument();
    const cards = within(weeks).getAllByRole('button');
    expect(cards.length).toBeGreaterThan(0);
    expect(within(weeks).getAllByText('Saldo ao fim').length).toBe(cards.length);

    await user.click(cards.at(-1)!);

    expect(await screen.findByRole('group', { name: 'Até o fim do mês' })).toBeInTheDocument();
    expect(window.location.search).not.toContain('strip=');
  });

  it('opens the weeks straight from the URL', async () => {
    renderApp('/?month=2026-10&strip=week');

    expect(await screen.findByRole('list', { name: /^Semanas/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Semana' })).toBeChecked();
  });

  it('turns each summary card into a link to the month in the right place', async () => {
    renderApp('/?month=2026-10');
    const cards = await screen.findByRole('region', { name: 'Resumo do mês' });

    expect(within(cards).getByRole('link', { name: 'Receitas' }).getAttribute('href')).toBe(
      '/recurrences?month=2026-10',
    );
    expect(within(cards).getByRole('link', { name: 'Despesas' }).getAttribute('href')).toBe(
      '/transactions?type=expense&month=2026-10',
    );
    expect(within(cards).getByRole('link', { name: 'Resultado do mês' }).getAttribute('href')).toBe(
      '/transactions?month=2026-10',
    );
  });

  it('takes the Despesas card to Transações already filtered by expenses', async () => {
    const user = userEvent.setup();
    renderApp('/?month=2026-10');
    const cards = await screen.findByRole('region', { name: 'Resumo do mês' });

    await user.click(within(cards).getByRole('link', { name: 'Despesas' }));

    await waitFor(() => expect(window.location.pathname).toBe('/transactions'));
    expect(window.location.search).toContain('type=expense');
    expect(window.location.search).toContain('month=2026-10');
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
