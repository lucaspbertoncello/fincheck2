import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

const LONG_WAIT = { timeout: 5000 };
const MISSING_ID = '0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b';

async function idOf(name: string): Promise<string> {
  const { json } = await callApi('GET', '/categories?status=all');
  const item = (json as { items: { id: string; name: string }[] }).items.find(
    (category) => category.name === name,
  );
  if (!item) throw new Error(`Seed has no category ${name}`);

  return item.id;
}

async function openPage(name: string, query = '') {
  const id = await idOf(name);
  renderApp(`/categories/${id}?month=${CURRENT_MONTH}${query}`);

  return id;
}

describe('CategoryPage (BR-CAT-010): an expense category', () => {
  it('shows the name, the way back, the figures, the 12 bars and the list by month', async () => {
    await openPage('Mercado');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mercado' }, LONG_WAIT),
    ).toBeVisible();
    expect(screen.getByText('Categoria de despesa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Categorias' })).toHaveAttribute(
      'href',
      expect.stringContaining('/categories'),
    );

    const summary = await screen.findByRole('region', { name: 'Resumo da categoria' });
    expect(within(summary).getByText('Gasto no período')).toBeInTheDocument();
    expect(within(summary).getByText('Transações')).toBeInTheDocument();
    expect(within(summary).getByText('Média por mês')).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: 'Editar' })).toBeInTheDocument();

    // The bars come with their table twin, the current month marked in the caption.
    const bars = await screen.findByRole('region', { name: 'Gasto por mês em Mercado' }, LONG_WAIT);
    const table = within(bars).getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(13);
    expect(within(table).getByText(/outubro de 2026 em destaque/i)).toBeInTheDocument();

    // The list is the one of Transações: under the month, only this category.
    expect(await screen.findByRole('heading', { name: 'Outubro 2026' }, LONG_WAIT)).toBeVisible();
  });

  it('keeps the period in the URL and reads it back', async () => {
    const user = userEvent.setup();
    await openPage('Mercado');
    await user.click(await screen.findByRole('button', { name: 'Período: Mês' }, LONG_WAIT));
    await user.click(await screen.findByRole('menuitemradio', { name: '12 meses' }));

    await waitFor(() => expect(window.location.search).toContain('period=12m'));
    expect(screen.getByRole('button', { name: 'Período: 12 meses' })).toBeInTheDocument();
  });

  it('reads ?period=year from the URL', async () => {
    await openPage('Mercado', '&period=year');

    expect(
      await screen.findByRole('button', { name: 'Período: Este ano' }, LONG_WAIT),
    ).toBeInTheDocument();
  });

  it('says so when the period has no transactions, and offers the whole history', async () => {
    const user = userEvent.setup();
    const id = await idOf('Mercado');
    renderApp(`/categories/${id}?month=2019-01`);

    expect(
      await screen.findByText('Nenhuma transação em janeiro de 2019', undefined, LONG_WAIT),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ver todo o histórico' }));

    await waitFor(() => expect(window.location.search).toContain('period=all'));
    expect(await screen.findByRole('heading', { name: 'Outubro 2026' }, LONG_WAIT)).toBeVisible();
  });

  it('opens the editor from "Editar"', async () => {
    const user = userEvent.setup();
    await openPage('Mercado');

    await user.click(await screen.findByRole('button', { name: 'Editar' }, LONG_WAIT));

    const dialog = await screen.findByRole('dialog', { name: 'Editar categoria' });
    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('Mercado');
  });
});

describe('CategoryPage: an income category', () => {
  it('says "recebido" where the expense page says "gasto"', async () => {
    await openPage('Salário');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Salário' }, LONG_WAIT),
    ).toBeVisible();
    expect(screen.getByText('Categoria de receita')).toBeInTheDocument();
    const summary = await screen.findByRole('region', { name: 'Resumo da categoria' });
    expect(within(summary).getByText('Recebido no período')).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: 'Recebido por mês em Salário' }, LONG_WAIT),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Categorias' })).toHaveAttribute(
      'href',
      expect.stringContaining('filter=income'),
    );
  });
});

describe('CategoryPage: states', () => {
  it('says the category does not exist, with the way back', async () => {
    renderApp(`/categories/${MISSING_ID}?month=${CURRENT_MONTH}`);

    expect(
      await screen.findByText('Essa categoria não existe', undefined, LONG_WAIT),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Voltar para Categorias' })).toBeInTheDocument();
  });

  it('shows the generic title and no name while the categories load', async () => {
    const id = await idOf('Mercado');
    server.use(http.get('/api/categories', () => delay('infinite')));
    renderApp(`/categories/${id}?month=${CURRENT_MONTH}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Categoria' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Categorias' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumo da categoria' })).not.toBeInTheDocument();
  });

  it('offers a retry when the categories fail', async () => {
    server.use(http.get('/api/categories', () => HttpResponse.json({}, { status: 500 })));
    renderApp(`/categories/${MISSING_ID}?month=${CURRENT_MONTH}`);

    expect(
      await screen.findByText('Não deu para carregar a categoria', undefined, LONG_WAIT),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('keeps the page and says only the bars failed', async () => {
    server.use(
      http.get('/api/dashboard/categories/:id/trend', () => HttpResponse.json({}, { status: 500 })),
    );
    await openPage('Mercado');

    expect(
      await screen.findByText('Não deu para carregar as barras', undefined, LONG_WAIT),
    ).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Mercado' })).toBeInTheDocument();
  });
});

describe('Categorias → the category page', () => {
  it('opens the page from the name of a row', async () => {
    const user = userEvent.setup();
    const id = await idOf('Mercado');
    renderApp('/categories');
    const table = await screen.findByRole('list', { name: 'Categorias de despesa' });

    await user.click(within(table).getByRole('button', { name: 'Abrir Mercado' }));

    await waitFor(() => expect(window.location.pathname).toBe(`/categories/${id}`));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mercado' }, LONG_WAIT),
    ).toBeVisible();
  });

  it('edits from the "…" menu of the row, not from the name', async () => {
    const user = userEvent.setup();
    renderApp('/categories');
    const table = await screen.findByRole('list', { name: 'Categorias de despesa' });

    await user.click(within(table).getByRole('button', { name: 'Ações de Mercado' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));

    expect(await screen.findByRole('dialog', { name: 'Editar categoria' })).toBeVisible();
    expect(window.location.pathname).toBe('/categories');
  });
});

describe('CategoryPage: the category that is a transfer', () => {
  it('says it does not count as spending, in place of the total', async () => {
    await openPage('Rotação entre contas');

    const summary = await screen.findByRole('region', { name: 'Resumo da categoria' }, LONG_WAIT);
    expect(within(summary).getByText('Não conta como gasto')).toBeInTheDocument();
  });

  it('hides the average per month and the 12 months, which have no value to show', async () => {
    await openPage('Rotação entre contas');

    const summary = await screen.findByRole('region', { name: 'Resumo da categoria' }, LONG_WAIT);
    expect(within(summary).queryByText('Média por mês')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Últimos 12 meses' })).not.toBeInTheDocument();
  });

  it('keeps the total for an ordinary category', async () => {
    await openPage('Mercado');

    const summary = await screen.findByRole('region', { name: 'Resumo da categoria' }, LONG_WAIT);
    expect(within(summary).queryByText('Não conta como gasto')).not.toBeInTheDocument();
    expect(within(summary).getByText('Média por mês')).toBeInTheDocument();
  });
});
