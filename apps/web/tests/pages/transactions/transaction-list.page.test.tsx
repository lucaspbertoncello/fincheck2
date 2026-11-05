import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
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

  it('has the direction control on its own row, with the three states and Todas checked', async () => {
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);

    const group = screen.getByRole('radiogroup', { name: 'Tipo de transação' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.textContent)).toEqual(['Todas', 'Despesas', 'Receitas']);
    expect(within(group).getByRole('radio', { name: 'Todas' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Despesas' })).not.toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Receitas' })).not.toBeChecked();
    // Fixed equal segments: the slide never resizes them.
    expect(radios.every((radio) => radio.className.includes('flex-1'))).toBe(true);
    // Not part of the "Filtros" panel anymore.
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    const dialog = await screen.findByRole('dialog', { name: 'Filtros' });
    expect(within(dialog).queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('switches to Receitas and back: the list and the URL follow, with the tone on the slide', async () => {
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);
    const group = screen.getByRole('radiogroup', { name: 'Tipo de transação' });

    fireEvent.click(within(group).getByRole('radio', { name: 'Receitas' }));
    await waitFor(() => expect(window.location.search).toContain('type=income'));
    await waitFor(() => expect(screen.queryByText('CINEMARK')).not.toBeInTheDocument());
    expect(within(group).getByRole('radio', { name: 'Receitas' })).toBeChecked();
    expect(group.querySelector('[data-tone="gain"]')).not.toBeNull();

    fireEvent.click(within(group).getByRole('radio', { name: 'Despesas' }));
    await waitFor(() => expect(window.location.search).toContain('type=expense'));
    expect(await screen.findByText('CINEMARK', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: 'Despesas' })).toBeChecked();
    expect(group.querySelector('[data-tone="loss"]')).not.toBeNull();

    fireEvent.click(within(group).getByRole('radio', { name: 'Todas' }));
    await waitFor(() => expect(window.location.search).not.toContain('type='));
    expect(within(group).getByRole('radio', { name: 'Todas' })).toBeChecked();
    expect(group.querySelector('[data-tone="neutral"]')).not.toBeNull();
  });

  it('keeps the direction in Por categoria', async () => {
    renderApp(`${PAGE}&type=expense`);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);

    fireEvent.click(screen.getByRole('radio', { name: /Por categoria/ }));
    await waitFor(() => expect(window.location.search).toContain('view=category'));
    const group = screen.getByRole('radiogroup', { name: 'Tipo de transação' });
    expect(within(group).getByRole('radio', { name: 'Despesas' })).toBeChecked();
    expect(window.location.search).toContain('type=expense');
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
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);
    const before = screen.queryAllByText('Ignorada').length;
    await openRowMenu('CINEMARK', 'Ignorar');

    expect(
      await screen.findByText(
        'Transação ignorada. Ela sai das contas do mês.',
        undefined,
        LONG_WAIT,
      ),
    ).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getAllByText('Ignorada')).toHaveLength(before + 1),
      LONG_WAIT,
    );

    fireEvent.click(screen.getByText('Desfazer'));
    await waitFor(() => expect(screen.queryAllByText('Ignorada')).toHaveLength(before), LONG_WAIT);
  });

  it('edits a transaction in the modal (the same one as "Nova transação")', async () => {
    const user = userEvent.setup();
    renderApp(PAGE);
    await openRowMenu('CINEMARK', 'Editar');

    const dialog = await screen.findByRole('dialog', { name: 'Editar transação' });
    expect(window.location.search).toContain('edit=');
    // A transaction from the bank cannot be deleted; only a manual one has "Excluir".
    expect(within(dialog).queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/O original do banco fica guardado/)).toBeInTheDocument();
    const description = within(dialog).getByRole('textbox', { name: 'Descrição' });
    await user.clear(description);
    await user.type(description, 'Cinema com a turma');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(
      (await screen.findAllByText('Cinema com a turma', undefined, LONG_WAIT)).length,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(window.location.search).not.toContain('edit='));
  });

  it('refuses an edit with an empty description and focuses the field', async () => {
    const user = userEvent.setup();
    renderApp(PAGE);
    await openRowMenu('CINEMARK', 'Editar');

    const dialog = await screen.findByRole('dialog', { name: 'Editar transação' });
    const description = within(dialog).getByRole('textbox', { name: 'Descrição' });
    await user.clear(description);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog).findByText('Escreva uma descrição.')).toBeInTheDocument();
    await waitFor(() => expect(description).toHaveFocus());
  });

  it('turns a transaction into a transfer and asks for its other leg', async () => {
    const user = userEvent.setup();
    renderApp(PAGE);
    await openRowMenu('CINEMARK', 'Editar');

    const dialog = await screen.findByRole('dialog', { name: 'Editar transação' });
    await user.click(within(dialog).getByRole('radio', { name: 'Transferência' }));

    // A transfer has no category; it has the other leg (here nothing matches the value).
    expect(within(dialog).queryByRole('button', { name: 'Mercado' })).not.toBeInTheDocument();
    expect(within(dialog).getByText('Outra perna da transferência')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(dialog).findByText('Escolha a outra perna da transferência.'),
    ).toBeVisible();
  });

  it('splits a transaction in two parts', async () => {
    const user = userEvent.setup();
    renderApp(PAGE);
    // The seed already has one split transaction; the new one makes two.
    const before = (await screen.findAllByText('Dividida em 2', undefined, LONG_WAIT)).length;
    await openRowMenu('PIX MERCADINHO SAO JOSE', 'Dividir');

    const dialog = await screen.findByRole('dialog', { name: 'Dividir transação' });
    expect(within(dialog).getByText('Soma confere')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Dividir' }));

    await waitFor(() => expect(screen.getAllByText('Dividida em 2')).toHaveLength(before + 1));
    await waitFor(() => expect(window.location.search).not.toContain('split='));
  });

  it('recategorizes in bulk from the selection mode and undoes it', async () => {
    const user = userEvent.setup();
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);

    await user.click(screen.getByRole('button', { name: 'Selecionar' }));
    await user.click(
      (await screen.findAllByRole('checkbox', { name: 'Selecionar UBER *TRIP' }))[0]!,
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar COMPRA DEBITO ELETROPECAS' }),
    );
    expect(screen.getByRole('button', { name: 'Concluir · 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Categorizar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Categorizar' });
    // "Aplicar" waits for a category and says so.
    expect(within(dialog).getByRole('button', { name: 'Aplicar' })).toBeDisabled();
    expect(within(dialog).getByText('Escolha uma categoria.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Transporte' }));
    await user.click(within(dialog).getByRole('button', { name: 'Aplicar' }));

    expect(
      await screen.findByText(/2 transações foram para Transporte/, undefined, LONG_WAIT),
    ).toBeInTheDocument();
    // The selection mode ends and "Desfazer" puts the previous state back.
    expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument();
    await user.click(screen.getByText('Desfazer'));
    await waitFor(() =>
      expect(screen.getAllByText('Para revisar').length).toBeGreaterThanOrEqual(2),
    );
  });

  it('switches to "Por categoria" and opens a category on the list', async () => {
    renderApp(`${PAGE}&view=category`);

    expect(await screen.findByText('por categoria', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(screen.getByText('por fonte')).toBeInTheDocument();
    const group = await screen.findByRole('button', { name: /Mercado/ });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Ver as \d+ transações na lista/ })).toBeNull();
    fireEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(await screen.findByRole('button', { name: /Ver as \d+ transações na lista/ }));

    await waitFor(() => expect(window.location.search).toContain('category='));
    expect(window.location.search).not.toContain('view=category');
    expect(await screen.findByRole('searchbox', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('creates a transaction by the ?new=transaction modal, then deletes it after confirming', async () => {
    const user = userEvent.setup();
    renderApp(`${PAGE}&new=transaction`);

    const dialog = await screen.findByRole('dialog', { name: 'Nova transação' }, LONG_WAIT);
    // The account chips carry the bank mark (or the wallet icon), not a generic icon.
    const account = await within(dialog).findByRole('radio', { name: 'Nubank' });
    expect(account.closest('label')?.querySelector('span[aria-hidden]')).not.toBeNull();
    // The date sits in the left column, under the description.
    let column = within(dialog).getByRole('textbox', { name: 'Descrição' }).parentElement;
    while (column && !within(column).queryByText('Data')) column = column.parentElement;
    expect(column).not.toBeNull();
    expect(within(column as HTMLElement).queryByText('Categoria')).toBeNull();
    // The amount is where the focus starts, and "Adicionar" waits for it, saying why.
    const amount = within(dialog).getByRole('textbox', { name: 'Valor' });
    await waitFor(() => expect(amount).toHaveFocus());
    expect(within(dialog).getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    expect(within(dialog).getByText('Informe o valor para adicionar.')).toBeInTheDocument();

    await user.type(amount, '1234');
    expect(within(dialog).getByRole('button', { name: 'Adicionar' })).toBeEnabled();
    // The description is required: the error shows under it and the focus goes there.
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }));
    const description = within(dialog).getByRole('textbox', { name: 'Descrição' });
    expect(await within(dialog).findByText('Escreva uma descrição.')).toBeInTheDocument();
    await waitFor(() => expect(description).toHaveFocus());

    // Enter saves.
    await user.type(description, 'Padaria da esquina{Enter}');

    expect(
      await screen.findByText('Padaria da esquina lançada.', undefined, LONG_WAIT),
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).not.toContain('new='));
    expect(await screen.findByText('Padaria da esquina')).toBeInTheDocument();

    await openRowMenu('Padaria da esquina', 'Editar');
    const edit = await screen.findByRole('dialog', { name: 'Editar transação' });
    await user.click(within(edit).getByRole('button', { name: 'Excluir' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Excluir esta transação?' });
    await user.click(within(confirm).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Padaria da esquina')).not.toBeInTheDocument());
  });

  it('picks the category, date and account of a new transaction with one tap each', async () => {
    const user = userEvent.setup();
    renderApp(`${PAGE}&new=transaction`);

    const dialog = await screen.findByRole('dialog', { name: 'Nova transação' }, LONG_WAIT);
    // The type switch changes the categories offered (the income ones have their own).
    expect(await within(dialog).findByRole('button', { name: /Outras/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Receita' }));
    expect(within(dialog).queryByRole('button', { name: 'Mercado' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: 'Despesa' }));

    const market = await within(dialog).findByRole('button', { name: 'Mercado' });
    await user.click(market);
    expect(market).toHaveAttribute('aria-pressed', 'true');
    await user.click(market);
    expect(market).toHaveAttribute('aria-pressed', 'false');

    // The rest of the categories sit behind "Outras…", a search that picks one.
    await user.click(within(dialog).getByRole('button', { name: /Outras/ }));
    const search = await screen.findByRole('combobox', { name: 'Buscar outra categoria' });
    await user.type(search, 'Pets');
    await user.click(await screen.findByRole('option', { name: 'Pets' }));
    // jsdom has no `inert`: a real browser drops the focus out of the folding search (and closes
    // its popover) at once, while here React Aria may still hide the dialog for a moment, so the
    // queries below look through `aria-hidden`.
    expect(
      await within(dialog).findByRole('button', { name: 'Pets', hidden: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(dialog).getByRole('button', { name: 'Ontem', hidden: true }));
    expect(within(dialog).getByRole('button', { name: 'Ontem', hidden: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(dialog).getByRole('radio', { name: 'Carteira', hidden: true }),
    ).toBeInTheDocument();
  });

  it('creates an installment purchase by the ?new=installment modal, with the preview', async () => {
    const user = userEvent.setup();
    renderApp(`${PAGE}&new=installment`);

    const dialog = await screen.findByRole('dialog', { name: 'Compra parcelada' }, LONG_WAIT);
    expect(within(dialog).getByRole('button', { name: 'Lançar compra' })).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Valor total' }), '120000');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Descrição' }),
      'Cadeira ergonômica',
    );
    await user.click(within(dialog).getByRole('button', { name: '6 parcelas' }));

    const preview = await within(dialog).findByRole('region', { name: 'Prévia das parcelas' });
    expect(within(preview).getByText('6×')).toBeInTheDocument();
    expect(preview).toHaveTextContent(/200,00/);
    await user.click(within(preview).getByRole('button', { name: 'Ver parcelas' }));
    expect(within(preview).getByText(/1\/6/)).toBeInTheDocument();
    expect(within(preview).getByText(/6\/6/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Lançar compra' }));

    expect(
      await screen.findByText(/Cadeira ergonômica lançada em 6 parcelas/, undefined, LONG_WAIT),
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).not.toContain('new='));
  });

  it('takes the installment value instead of the total when asked, and any other count', async () => {
    const user = userEvent.setup();
    renderApp(`${PAGE}&new=installment`);

    const dialog = await screen.findByRole('dialog', { name: 'Compra parcelada' }, LONG_WAIT);
    await user.click(within(dialog).getByRole('radio', { name: 'Valor da parcela' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Valor da parcela' }), '8990');
    await user.click(within(dialog).getByRole('button', { name: 'Outro' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Número de parcelas' }), '10');

    // 10 x 89,90: the total is 899,00 and the headline says it.
    const preview = await within(dialog).findByRole('region', { name: 'Prévia das parcelas' });
    expect(within(preview).getByText('10×')).toBeInTheDocument();
    expect(preview).toHaveTextContent(/89,90/);
    expect(preview).toHaveTextContent(/899,00/);
  });

  it('narrows the list to one day with ?day= and clears it from the chip', async () => {
    const user = userEvent.setup();
    const cinemark = db.transactions.find(
      (item) => item.description === 'CINEMARK' && item.occurredOn.startsWith(CURRENT_MONTH),
    );
    const other = db.transactions.find(
      (item) =>
        item.occurredOn.startsWith(CURRENT_MONTH) &&
        item.occurredOn !== cinemark?.occurredOn &&
        item.description === 'IFOOD *RESTAURANTE',
    );
    if (!cinemark || !other) throw new Error('The seed lost CINEMARK or IFOOD in this month');
    const [, month = '', day = ''] = cinemark.occurredOn.split('-');
    renderApp(`${PAGE}&day=${cinemark.occurredOn}`);

    expect(await screen.findByText('CINEMARK', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(screen.queryByText('IFOOD *RESTAURANTE')).not.toBeInTheDocument();
    const chip = screen.getByRole('button', { name: new RegExp(`Dia ${day}/${month}`) });

    await user.click(chip);
    await waitFor(() => expect(window.location.search).not.toContain('day='));
    expect(await screen.findByText('IFOOD *RESTAURANTE', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dia \d\d\/\d\d/ })).not.toBeInTheDocument();
  });

  it('says so when the chosen day has no transactions and offers the whole month', async () => {
    const user = userEvent.setup();
    const used = new Set(db.transactions.map((item) => item.occurredOn));
    const emptyDay = Array.from(
      { length: 27 },
      (_, index) => `${CURRENT_MONTH}-${String(index + 1).padStart(2, '0')}`,
    ).find((day) => !used.has(day));
    if (!emptyDay) throw new Error('Every day of the month has a transaction in the seed');
    renderApp(`${PAGE}&day=${emptyDay}`);

    expect(
      await screen.findByRole('heading', { name: /Nenhuma transação no dia/ }, LONG_WAIT),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostrar o mês todo' }));
    await waitFor(() => expect(window.location.search).not.toContain('day='));
    expect(await screen.findByText('CINEMARK', undefined, LONG_WAIT)).toBeInTheDocument();
  });

  it('shows "Não deu para sincronizar" after a failed sync and fetches again on "Tentar agora"', async () => {
    const user = userEvent.setup();
    const bradesco = db.connections.find((item) => item.institutionName === 'Bradesco');
    if (!bradesco) throw new Error('The seed has no Bradesco connection');
    bradesco.status = 'error';
    bradesco.errorCode = 'LOGIN_ERROR';
    renderApp(PAGE);

    expect(
      await screen.findByText('Não deu para sincronizar o Bradesco', undefined, LONG_WAIT),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar agora' }));
    await waitFor(() => expect(db.runs.some((item) => item.run.trigger === 'retry')).toBe(true));
  });

  it('shows no sync banner when every connection is fine', async () => {
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);
    expect(screen.queryByText(/Não deu para sincronizar/)).not.toBeInTheDocument();
  });
});
