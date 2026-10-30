import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/clock.constant.ts';
import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

const PAGE = `/transactions?month=${CURRENT_MONTH}`;
const LONG_WAIT = { timeout: 5000 };

async function openRowMenu(name: string, item: string) {
  const trigger = await screen.findByRole('button', { name: `Ações de ${name}` }, LONG_WAIT);
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

describe('TransactionListPage', () => {
  it('shows the month: totals, the review strip and the days with their rows', async () => {
    renderApp(PAGE);

    expect(await screen.findByText('CINEMARK', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Totais do mês' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar' })).toBeInTheDocument();
    // Each day is a block with its count; the bank-changed and edited boxes sit under their rows.
    expect(screen.getAllByText(/\d+ transaç(ão|ões)/).length).toBeGreaterThan(2);
    expect(screen.getByText(/O banco mudou o valor de/)).toBeInTheDocument();
  });

  it('reads ?ruleId= (the "Ver transações" of a rule) and lists only what that rule categorized', async () => {
    const asked: Array<string | null> = [];
    server.use(
      http.get('/api/transactions', ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('ruleId'));
        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );
    renderApp(`${PAGE}&ruleId=019a0000-0000-7000-8000-000000000001`);

    await waitFor(() => expect(asked).toContain('019a0000-0000-7000-8000-000000000001'), LONG_WAIT);
    expect(screen.queryByText('CINEMARK')).not.toBeInTheDocument();
    expect(window.location.search).toContain('ruleId=019a0000-0000-7000-8000-000000000001');
  });

  it('the review strip leads to the review queue, keeping the month', async () => {
    renderApp(PAGE);
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar' }, LONG_WAIT));

    await waitFor(() => expect(window.location.pathname).toBe('/transactions/review'));
    expect(window.location.search).toContain(`month=${CURRENT_MONTH}`);
  });

  it('searches by text and keeps the text in the URL', async () => {
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), {
      target: { value: 'cinemark' },
    });

    await waitFor(() => expect(window.location.search).toContain('q=cinemark'));
    await waitFor(() => expect(screen.queryByText('IFOOD *RESTAURANTE')).not.toBeInTheDocument());
    expect(screen.getByText('CINEMARK')).toBeInTheDocument();
  });

  it('filters by type from the Filtros panel (the type control of the phone)', async () => {
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filtros' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Receitas' }));

    await waitFor(() => expect(window.location.search).toContain('type=income'));
    await waitFor(() => expect(screen.queryByText('CINEMARK')).not.toBeInTheDocument());
  });

  it('shows the empty month with its actions and the error with "Tentar de novo"', async () => {
    renderApp('/transactions?month=2020-01');
    expect(
      await screen.findByRole('heading', { name: 'Nenhuma transação em janeiro ainda' }, LONG_WAIT),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conectar contas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lançar transação' })).toBeInTheDocument();
  });

  it('shows an error when the list fails and loads it on "Tentar de novo"', async () => {
    server.use(
      http.get('/api/transactions', () =>
        HttpResponse.json({ code: 'BOOM', message: 'falhou' }, { status: 500 }),
      ),
    );
    renderApp(PAGE);

    expect(
      await screen.findByText('Não deu para carregar as transações', undefined, LONG_WAIT),
    ).toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('CINEMARK', undefined, LONG_WAIT)).toBeInTheDocument();
  });

  it('ignores a transaction and brings it back with "Desfazer"', async () => {
    renderApp(PAGE);
    const before = (await screen.findAllByText('Ignorada', undefined, LONG_WAIT)).length;
    await openRowMenu('CINEMARK', 'Ignorar');

    expect(
      await screen.findByText(
        'Transação ignorada. Ela sai das contas do mês.',
        undefined,
        LONG_WAIT,
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Ignorada')).toHaveLength(before + 1));

    fireEvent.click(screen.getByText('Desfazer'));
    await waitFor(() => expect(screen.getAllByText('Ignorada')).toHaveLength(before));
  });

  it('edits a transaction in its row', async () => {
    renderApp(PAGE);
    await openRowMenu('CINEMARK', 'Editar');

    const form = await screen.findByRole('form', { name: 'Editar transação' });
    expect(window.location.search).toContain('edit=');
    fireEvent.change(within(form).getByRole('textbox', { name: 'Descrição' }), {
      target: { value: 'Cinema com a turma' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar' }));

    expect(
      (await screen.findAllByText('Cinema com a turma', undefined, LONG_WAIT)).length,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(window.location.search).not.toContain('edit='));
  });

  it('refuses an edit with an empty description and focuses the field', async () => {
    renderApp(PAGE);
    await openRowMenu('CINEMARK', 'Editar');

    const form = await screen.findByRole('form', { name: 'Editar transação' });
    const description = within(form).getByRole('textbox', { name: 'Descrição' });
    fireEvent.change(description, { target: { value: '' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar' }));

    expect(await within(form).findByText('Escreva uma descrição.')).toBeInTheDocument();
    await waitFor(() => expect(description).toHaveFocus());
  });

  it('splits a transaction in two parts', async () => {
    renderApp(PAGE);
    await openRowMenu('PIX MERCADINHO SAO JOSE', 'Dividir');

    const form = await screen.findByRole('form', { name: 'Dividir transação' });
    fireEvent.click(within(form).getByRole('button', { name: 'Dividir' }));

    expect(await screen.findByText('Dividida em 2', undefined, LONG_WAIT)).toBeInTheDocument();
  });

  it('recategorizes in bulk from the selection mode and undoes it', async () => {
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar' }));
    fireEvent.click(
      (await screen.findAllByRole('checkbox', { name: 'Selecionar UBER *TRIP' }))[0]!,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar COMPRA DEBITO ELETROPECAS' }));
    expect(screen.getByRole('button', { name: 'Concluir · 2' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Categorizar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Categorizar' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Transporte' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aplicar' }));

    expect(
      await screen.findByText(/2 transações foram para Transporte/, undefined, LONG_WAIT),
    ).toBeInTheDocument();
    // The selection mode ends and "Desfazer" puts the previous state back.
    expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Desfazer'));
    await waitFor(() =>
      expect(screen.getAllByText('Para revisar').length).toBeGreaterThanOrEqual(2),
    );
  });

  it('switches to "Por categoria" and opens a category on the list', async () => {
    renderApp(`${PAGE}&view=category`);

    expect(await screen.findByText('por categoria', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(screen.getByText('por fonte')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Mercado/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Ver as \d+ transações na lista/ }));

    await waitFor(() => expect(window.location.search).toContain('category='));
    expect(window.location.search).not.toContain('view=category');
    expect(await screen.findByRole('searchbox', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('creates a transaction by the ?new=transaction modal, then deletes it after confirming', async () => {
    renderApp(`${PAGE}&new=transaction`);

    const dialog = await screen.findByRole('dialog', { name: 'Nova transação' }, LONG_WAIT);
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeEnabled(),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    // The same rules as the request: the errors show under the fields.
    expect(
      await within(dialog).findByText('O valor precisa ser maior que zero.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Escreva uma descrição.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getAllByRole('textbox')[0]!, { target: { value: '1234' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Descrição' }), {
      target: { value: 'Padaria da esquina' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Padaria da esquina lançada.', undefined, LONG_WAIT),
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).not.toContain('new='));
    expect(await screen.findByText('Padaria da esquina')).toBeInTheDocument();

    await openRowMenu('Padaria da esquina', 'Editar');
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir transação' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Excluir esta transação?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Padaria da esquina')).not.toBeInTheDocument());
  });

  it('creates an installment purchase by the ?new=installment modal, with the preview', async () => {
    renderApp(`${PAGE}&new=installment`);

    const dialog = await screen.findByRole('dialog', { name: 'Compra parcelada' }, LONG_WAIT);
    fireEvent.change(within(dialog).getAllByRole('textbox')[0]!, { target: { value: '120000' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Descrição' }), {
      target: { value: 'Cadeira ergonômica' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Parcelas' }), {
      target: { value: '6' },
    });

    const preview = await within(dialog).findByRole('region', { name: 'Prévia das parcelas' });
    expect(within(preview).getByText(/1\/6/)).toBeInTheDocument();
    expect(within(preview).getByText(/e mais 2 parcelas/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Lançar compra' }));

    expect(
      await screen.findByText(/Cadeira ergonômica lançada em 6 parcelas/, undefined, LONG_WAIT),
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).not.toContain('new='));
  });
});
