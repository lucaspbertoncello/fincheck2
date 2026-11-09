import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import { describe, expect, it, vi } from 'vitest';

import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';
import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { makeOccurrenceLate } from '#tests/support/recurrences/occurrence/make-occurrence-late.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { buildExpenseCaption } from '#/features/recurrences/recurrence-list/utils/build-expense-caption.util.ts';
import { buildIncomeCaption } from '#/features/recurrences/recurrence-list/utils/build-income-caption.util.ts';
import { buildOccurrenceChips } from '#/features/recurrences/recurrence-list/utils/build-occurrence-chips.util.ts';
import { getOccurrencePlacement } from '#/features/recurrences/recurrence-list/utils/get-occurrence-placement.util.ts';
import { formatMoneyNote } from '#/features/recurrences/utils/format-money-note.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';

resetDatabaseBeforeEach();

// Rendering the whole app is quick alone, but with the other test workers busy the first paint of
// a page can take longer than the 1 s that findBy waits by default (and than the 5 s of a test), so
// these waits are explicit.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

const URL = `/recurrences?month=${CURRENT_MONTH}`;

async function findAttentionStrip() {
  return within(await screen.findByRole('region', { name: 'Precisa de você' }));
}

const INCOME_URL = `${URL}&flow=income`;

async function findFlowSelector() {
  return within(await screen.findByRole('radiogroup', { name: 'Tipo de recorrência' }));
}

describe('RecurrenceListPage', () => {
  it('opens on the expenses: what needs you, the card, the strip and the list of that side only', async () => {
    renderApp(URL);

    const attention = await findAttentionStrip();
    expect(attention.getByText('Diarista')).toBeInTheDocument();
    expect(attention.getByText('Internet')).toBeInTheDocument();
    expect(attention.getAllByText('Atrasado').length).toBeGreaterThan(0);
    // Internet and Spotify (a subscription whose price went up) both wait for an answer.
    expect(attention.getAllByText('Valor diferente')).toHaveLength(2);

    const selector = await findFlowSelector();
    expect(selector.getByRole('radio', { name: 'Despesas' })).toBeChecked();
    expect(selector.getByRole('radio', { name: 'Receitas' })).not.toBeChecked();

    expect(screen.getByText('Despesas fixas', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText(/^Receitas esperadas em /)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /, dia a dia$/ })).toBeInTheDocument();

    const expenses = within(screen.getByRole('region', { name: 'Despesas fixas' }));
    expect(expenses.getByText('Academia')).toBeInTheDocument();
    expect(expenses.getByText('Plano celular')).toBeInTheDocument();
    expect(expenses.queryByText('Diarista')).not.toBeInTheDocument();

    expect(screen.queryByRole('region', { name: 'Receitas' })).not.toBeInTheDocument();
    expect(screen.queryByText('Mesada')).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('flow=');
  });

  it('opens on the incomes with ?flow=income, with no expense anywhere', async () => {
    makeOccurrenceLate('Lume Design (freela)');
    renderApp(INCOME_URL);

    const attention = await findAttentionStrip();
    expect(attention.getByText('Lume Design (freela)')).toBeInTheDocument();
    expect(attention.queryByText('Diarista')).not.toBeInTheDocument();
    expect(attention.queryByText('Internet')).not.toBeInTheDocument();
    expect(attention.queryByText('Valor diferente')).not.toBeInTheDocument();

    const selector = await findFlowSelector();
    expect(selector.getByRole('radio', { name: 'Receitas' })).toBeChecked();

    expect(screen.getByText(/^Receitas esperadas em /)).toBeInTheDocument();
    expect(screen.queryByText('Despesas fixas', { selector: 'span' })).not.toBeInTheDocument();

    const incomes = within(screen.getByRole('region', { name: 'Receitas' }));
    expect(incomes.getByText('Mesada')).toBeInTheDocument();
    expect(incomes.getByText('Parcial')).toBeInTheDocument();
    expect(incomes.getByText('Salário Alvorada, dia 15')).toBeInTheDocument();

    expect(screen.queryByRole('region', { name: 'Despesas fixas' })).not.toBeInTheDocument();
    expect(screen.queryByText('Academia')).not.toBeInTheDocument();
    expect(screen.queryByText('Plano celular')).not.toBeInTheDocument();
  });

  it('falls back to the expenses when ?flow is not a side', async () => {
    renderApp(`${URL}&flow=tudo`);

    const selector = await findFlowSelector();
    expect(selector.getByRole('radio', { name: 'Despesas' })).toBeChecked();
    expect(await screen.findByRole('region', { name: 'Despesas fixas' })).toBeInTheDocument();
  });

  it('switches the side from the selector, keeps the month and writes ?flow= in the URL', async () => {
    renderApp(`${URL}&day=${CURRENT_MONTH}-15`);
    const selector = await findFlowSelector();
    await screen.findByRole('region', { name: 'Despesas fixas' });

    await userEvent.click(selector.getByRole('radio', { name: 'Receitas' }));

    expect(await screen.findByRole('region', { name: 'Receitas' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Despesas fixas' })).not.toBeInTheDocument();
    expect(window.location.search).toContain('flow=income');
    expect(window.location.search).toContain(`month=${CURRENT_MONTH}`);
    expect(window.location.search).toContain(`day=${CURRENT_MONTH}-15`);

    await userEvent.click(selector.getByRole('radio', { name: 'Despesas' }));

    expect(await screen.findByRole('region', { name: 'Despesas fixas' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Receitas' })).not.toBeInTheDocument();
    expect(window.location.search).toContain('flow=expense');
  });

  it('lists in the strip only the occurrences of the side that is chosen', async () => {
    renderApp(URL);
    await screen.findByRole('region', { name: 'Despesas fixas' });
    // The label of each day names the markers on it ("Despesa esperada", "Receita atrasada").
    const dayLabels = () =>
      within(screen.getByRole('region', { name: /, dia a dia$/ }))
        .getAllByRole('option')
        .map((option) => option.getAttribute('aria-label') ?? '')
        .join('|');

    expect(dayLabels()).toMatch(/Despesa /);
    expect(dayLabels()).not.toMatch(/Receita /);

    await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Receitas' }));
    await screen.findByRole('region', { name: 'Receitas' });

    expect(dayLabels()).toMatch(/Receita /);
    expect(dayLabels()).not.toMatch(/Despesa /);
  });

  it('keeps "Fora deste mês" of each side apart', async () => {
    // Paused with nothing left in the month: the recurrence has no occurrence to list.
    for (const name of ['Mesada', 'Plano celular']) {
      const recurrence = db.recurrences.find((item) => item.name === name);
      if (!recurrence) throw new Error(`No recurrence ${name}`);
      recurrence.pausedAt = `${CURRENT_MONTH}-01T12:00:00.000Z`;
      db.occurrences = db.occurrences.filter((item) => item.recurrenceId !== recurrence.id);
    }

    renderApp(URL);
    const expenses = await screen.findByRole('region', { name: 'Fora deste mês' });
    expect(within(expenses).getByText('Plano celular')).toBeInTheDocument();
    expect(within(expenses).queryByText('Mesada')).not.toBeInTheDocument();

    await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Receitas' }));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Despesas fixas' })).not.toBeInTheDocument(),
    );
    const incomes = screen.getByRole('region', { name: 'Fora deste mês' });
    expect(within(incomes).getByText('Mesada')).toBeInTheDocument();
    expect(within(incomes).queryByText('Plano celular')).not.toBeInTheDocument();
  });

  it('says there is no income when only the other side has recurrences', async () => {
    db.recurrences = db.recurrences.filter((item) => item.kind === 'expense');
    const expenseIds = new Set(db.recurrences.map((item) => item.id));
    db.occurrences = db.occurrences.filter((item) => expenseIds.has(item.recurrenceId));

    renderApp(INCOME_URL);

    const incomes = within(await screen.findByRole('region', { name: 'Receitas' }));
    expect(incomes.getByText('Nenhuma receita fixa neste mês.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Despesas fixas' })).not.toBeInTheDocument();
  });

  it('shows in the card the total and the caption of the side that is chosen', async () => {
    const summary = (await callApi('GET', `/recurrences/summary?month=${CURRENT_MONTH}`))
      .json as Recurrence.Summary;
    const cardOf = (label: string | RegExp) => {
      const card = screen.getByText(label, { selector: 'span' }).closest('div');
      if (!card) throw new Error(`No card ${label}`);
      return card;
    };
    // The card writes "−R$816,29": compare without spaces.
    const plain = (text: string) => text.replace(/\s/g, '');
    const textOf = (card: HTMLElement) => plain(card.textContent ?? '');

    renderApp(URL);
    await screen.findByRole('region', { name: 'Despesas fixas' });
    const expenseCard = textOf(cardOf('Despesas fixas'));
    expect(expenseCard).toContain(plain(formatMoneyNote(summary.expenses.expectedCents, false)));
    expect(expenseCard).toContain(plain(buildExpenseCaption(summary)));

    await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Receitas' }));
    await screen.findByRole('region', { name: 'Receitas' });
    const incomeCard = textOf(cardOf(/^Receitas esperadas em /));
    expect(incomeCard).toContain(plain(formatMoneyNote(summary.incomes.expectedCents, false)));
    expect(incomeCard).toContain(plain(buildIncomeCaption(summary, false)));
  });

  it('counts "Precisa de você" by side and hides it on the side with nothing pending', async () => {
    renderApp(URL);
    const expenseAttention = await findAttentionStrip();
    // Diarista, Internet, Spotify and one more late expense.
    expect(expenseAttention.getByText('4 recorrências')).toBeInTheDocument();

    await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Receitas' }));
    await screen.findByRole('region', { name: 'Receitas' });
    expect(screen.queryByRole('region', { name: 'Precisa de você' })).not.toBeInTheDocument();
  });

  it('counts one pending income on Receitas while Despesas keeps its own count', async () => {
    makeOccurrenceLate('Lume Design (freela)');
    renderApp(INCOME_URL);

    expect((await findAttentionStrip()).getByText('1 recorrência')).toBeInTheDocument();

    await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Despesas' }));
    expect((await findAttentionStrip()).getByText('4 recorrências')).toBeInTheDocument();
  });

  describe('the strip of one side', () => {
    async function listOccurrences() {
      const { json } = await callApi('GET', `/occurrences?month=${CURRENT_MONTH}`);
      return (json as { items: Occurrence.Dto[] }).items;
    }
    const strip = () => within(screen.getByRole('region', { name: /, dia a dia$/ }));

    it('lists the chosen day with the incomes only on Receitas', async () => {
      const income = (await listOccurrences()).find(
        (item) => item.kind === 'income' && getOccurrencePlacement(item)?.date != null,
      );
      const date = income ? getOccurrencePlacement(income)?.date : null;
      if (!income || !date) throw new Error('No income on a day');

      renderApp(`${URL}&day=${date}`);
      await screen.findByRole('region', { name: 'Despesas fixas' });
      expect(strip().queryByText(income.recurrenceName)).not.toBeInTheDocument();

      await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Receitas' }));
      expect(await strip().findByText(income.recurrenceName)).toBeInTheDocument();
    });

    it('lists the chosen day with the expenses only on Despesas', async () => {
      const expense = (await listOccurrences()).find(
        (item) => item.kind === 'expense' && getOccurrencePlacement(item)?.date != null,
      );
      const date = expense ? getOccurrencePlacement(expense)?.date : null;
      if (!expense || !date) throw new Error('No expense on a day');

      renderApp(`${URL}&day=${date}`);
      await screen.findByRole('region', { name: 'Despesas fixas' });
      expect(await strip().findByText(expense.recurrenceName)).toBeInTheDocument();

      await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Receitas' }));
      await screen.findByRole('region', { name: 'Receitas' });
      expect(strip().queryByText(expense.recurrenceName)).not.toBeInTheDocument();
    });

    it('puts in "Sem dia certo" the chips of the side that is chosen', async () => {
      const items = await listOccurrences();
      const labelsOf = (kind: string) =>
        buildOccurrenceChips(
          CURRENT_MONTH,
          items.filter((item) => item.kind === kind),
        ).map((chip) => chip.label);
      const expenseLabels = labelsOf('expense');
      const incomeLabels = labelsOf('income');
      expect(expenseLabels.length + incomeLabels.length).toBeGreaterThan(0);

      renderApp(URL);
      await screen.findByRole('region', { name: 'Despesas fixas' });
      for (const label of expenseLabels) expect(screen.getByText(label)).toBeInTheDocument();
      for (const label of incomeLabels) expect(screen.queryByText(label)).not.toBeInTheDocument();

      await userEvent.click((await findFlowSelector()).getByRole('radio', { name: 'Receitas' }));
      await screen.findByRole('region', { name: 'Receitas' });
      for (const label of incomeLabels) expect(screen.getByText(label)).toBeInTheDocument();
      for (const label of expenseLabels) expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  it('keeps the side in the URL when the modal that was open over it closes', async () => {
    renderApp(`${INCOME_URL}&new=recurrence`);
    expect(await screen.findByRole('dialog', { name: 'Nova recorrência' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(window.location.search).not.toContain('new='));
    expect(window.location.search).toContain('flow=income');
    expect(window.location.search).toContain(`month=${CURRENT_MONTH}`);
  });

  it('marks the late occurrence as paid, moves it to the list and offers to undo', async () => {
    renderApp(URL);
    const attention = await findAttentionStrip();

    const diarista = attention.getByText('Diarista').closest('li');
    if (!diarista) throw new Error('No row for Diarista');

    fireEvent.click(within(diarista).getByRole('button', { name: 'Marcar como paga' }));

    expect(await screen.findByText('Diarista marcada como paga.')).toBeInTheDocument();
    await waitFor(() => expect(attention.queryByText('Diarista')).not.toBeInTheDocument());
    const expenses = within(screen.getByRole('region', { name: 'Despesas fixas' }));
    expect(await expenses.findByText('Diarista')).toBeInTheDocument();

    // The toast action is named by what it does ("Desfazer"), not by the close slot's "Close".
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));

    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: 'Precisa de você' })).getByText('Diarista'),
      ).toBeInTheDocument(),
    );
  });

  it('answers the different amount with "Atualizar para" and the row leaves the strip', async () => {
    renderApp(URL);
    const attention = await findAttentionStrip();

    // The question sits in the action strip of the Internet row (Spotify asks the same).
    const internet = attention.getByText('Internet').closest('li');
    if (!internet) throw new Error('No row for Internet');

    fireEvent.click(within(internet).getByRole('button', { name: /^Atualizar para/ }));

    await waitFor(() => expect(attention.queryByText('Internet')).not.toBeInTheDocument());
  });

  it('dismisses the month from the "…" menu', async () => {
    renderApp(URL);
    const expenses = within(await screen.findByRole('region', { name: 'Despesas fixas' }));

    fireEvent.click(await expenses.findByRole('button', { name: 'Ações de Plano celular' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Dispensar este mês' }));

    expect(await screen.findByText('Plano celular dispensada neste mês.')).toBeInTheDocument();
    expect(await expenses.findByText('Dispensada')).toBeInTheDocument();
  });

  it('asks before deleting a recurrence', async () => {
    renderApp(URL);
    const expenses = within(await screen.findByRole('region', { name: 'Despesas fixas' }));

    fireEvent.click(await expenses.findByRole('button', { name: 'Ações de Plano celular' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Excluir' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Excluir Plano celular?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(expenses.queryByText('Plano celular')).not.toBeInTheDocument());
  });

  it('links a transaction to an income that is waiting', async () => {
    makeOccurrenceLate('Lume Design (freela)');
    server.use(
      http.get('/api/occurrences/:id/candidates', () =>
        HttpResponse.json({
          items: [
            {
              transactionId: '3f0c3a1e-0000-4000-8000-000000000001',
              description: 'PIX M SOUZA',
              occurredOn: `${CURRENT_MONTH}-26`,
              amountCents: 395_000,
              accountId: '3f0c3a1e-0000-4000-8000-000000000002',
              counterparty: 'M SOUZA',
            },
          ],
        }),
      ),
      http.post('/api/occurrences/:id/payments', ({ params }) =>
        HttpResponse.json(
          createTestOccurrence({
            id: String(params['id']),
            recurrenceId: '3f0c3a1e-0000-4000-8000-000000000004',
            recurrenceName: 'Lume Design (freela)',
            kind: 'income',
            month: CURRENT_MONTH,
            status: 'confirmed',
            payments: [
              {
                id: '3f0c3a1e-0000-4000-8000-000000000003',
                transactionId: '3f0c3a1e-0000-4000-8000-000000000001',
                amountCents: 395_000,
                occurredOn: `${CURRENT_MONTH}-26`,
                linkedBy: 'user',
              },
            ],
          }),
          { status: 201 },
        ),
      ),
    );
    renderApp(INCOME_URL);
    const attention = await findAttentionStrip();

    fireEvent.click(
      within(attention.getByText('Lume Design (freela)').closest('li')!).getByRole('button', {
        name: 'Vincular transação',
      }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Vincular transação' });
    expect(window.location.search).toContain('link=');
    expect(await within(dialog).findByText('PIX M SOUZA')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vincular' }));

    expect(
      await screen.findByText('Transação vinculada a Lume Design (freela).'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('starts with the closest candidate chosen and links the one picked instead', async () => {
    makeOccurrenceLate('Lume Design (freela)');
    const first = '3f0c3a1e-0000-4000-8000-000000000001';
    const second = '3f0c3a1e-0000-4000-8000-000000000005';
    let linked: unknown;
    server.use(
      http.get('/api/occurrences/:id/candidates', () =>
        HttpResponse.json({
          items: ['PIX M SOUZA', 'PIX LUME DESIGN'].map((description, index) => ({
            transactionId: index === 0 ? first : second,
            description,
            occurredOn: `${CURRENT_MONTH}-26`,
            amountCents: 395_000,
            accountId: '3f0c3a1e-0000-4000-8000-000000000002',
            counterparty: null,
          })),
        }),
      ),
      http.post('/api/occurrences/:id/payments', async ({ request }) => {
        linked = await request.json();
        return HttpResponse.json({ message: 'stop' }, { status: 500 });
      }),
    );
    renderApp(INCOME_URL);
    const attention = await findAttentionStrip();

    fireEvent.click(
      within(attention.getByText('Lume Design (freela)').closest('li')!).getByRole('button', {
        name: 'Vincular transação',
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Vincular transação' });
    const rows = await within(dialog).findAllByRole('radio');
    expect(rows[0]).toBeChecked();

    await userEvent.click(rows[1]!);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(linked).toEqual({ transactionId: second }));
  });

  it('says so when no transaction is near the occurrence', async () => {
    makeOccurrenceLate('Lume Design (freela)');
    server.use(http.get('/api/occurrences/:id/candidates', () => HttpResponse.json({ items: [] })));
    renderApp(INCOME_URL);
    const attention = await findAttentionStrip();

    fireEvent.click(
      within(attention.getByText('Lume Design (freela)').closest('li')!).getByRole('button', {
        name: 'Vincular transação',
      }),
    );

    expect(await screen.findByText(/Nenhuma transação sem vínculo/)).toBeInTheDocument();
  });

  it('edits the expected amount of one month', async () => {
    renderApp(URL);
    const attention = await findAttentionStrip();

    // Two buttons at most on the strip: editing the expected amount lives in the "…" menu.
    fireEvent.click(attention.getByRole('button', { name: 'Ações de Diarista' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar valor esperado' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar valor esperado' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Valor esperado' }), {
      target: { value: '30000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar valor' }));

    expect(await screen.findByText('Valor esperado de Diarista atualizado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  describe('"Nova recorrência" (?new=recurrence)', () => {
    it('opens by the URL and saves a new recurrence into the list', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome' }), {
        target: { value: 'Seguro do carro' },
      });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Valor esperado' }), {
        target: { value: '19900' },
      });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Dia do mês' }), {
        target: { value: '10' },
      });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Mais opções' }));
      fireEvent.change(within(dialog).getByRole('textbox', { name: /Aparece no extrato como/ }), {
        target: { value: 'seguro auto' },
      });
      expect(
        await within(dialog).findByRole('list', { name: 'Próximas datas' }),
      ).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar recorrência' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(window.location.search).not.toContain('new=');
      // The free-balance panel repeats the names: at least one match must be outside it, in the list.
      await waitFor(() => {
        const names = screen.getAllByText('Seguro do carro');
        expect(names.some((name) => !name.closest('[aria-label="Saldo em contas"]'))).toBe(true);
      });
    });

    it('shows the error next to each invalid field and keeps the modal open', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Dia do mês' }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar recorrência' }));

      expect(
        await within(dialog).findByText('Informe um valor maior que zero.'),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/Dê um nome à recorrência/)).toBeInTheDocument();
      expect(within(dialog).getByText('Informe um dia de 1 a 31.')).toBeInTheDocument();
      await waitFor(() =>
        expect(within(dialog).getByRole('textbox', { name: 'Valor esperado' })).toHaveFocus(),
      );
    });

    it('changes the fields and the card when another date rule is chosen', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      fireEvent.click(within(dialog).getByRole('radio', { name: /Dia útil/ }));

      expect(
        await within(dialog).findByRole('textbox', { name: 'Número do dia útil' }),
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole('textbox', { name: 'Dia do mês' })).not.toBeInTheDocument();
    });
  });

  describe('"Nova recorrência" side', () => {
    it('opens as Receita with ?flow=income', async () => {
      renderApp(`${INCOME_URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      expect(within(dialog).getByRole('radio', { name: 'Receita' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(within(dialog).getByText('Vem de quem')).toBeInTheDocument();
    });

    it('opens as Despesa without ?flow and with ?flow=expense', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });
      expect(within(dialog).getByRole('radio', { name: 'Despesa' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(within(dialog).getByText('Para quem')).toBeInTheDocument();
    });
  });

  describe('"Nova recorrência" choices', () => {
    it('opens with the focus on the name, the rule filled like its card and the next dates already there', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      await waitFor(() =>
        expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveFocus(),
      );
      expect(within(dialog).getByRole('textbox', { name: 'Dia do mês' })).toHaveValue('15');
      expect(within(dialog).queryByText(/Complete a regra/)).not.toBeInTheDocument();

      const trail = await within(dialog).findByRole('list', { name: 'Próximas datas' });
      expect(within(trail).getAllByRole('listitem')).toHaveLength(3);
    });

    it('fills the numbers of the rule that is chosen, so it is never opened empty', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      await userEvent.click(within(dialog).getByRole('radio', { name: /Dia útil/ }));
      expect(within(dialog).getByRole('textbox', { name: 'Número do dia útil' })).toHaveValue('5');

      await userEvent.click(within(dialog).getByRole('radio', { name: /Perto do dia/ }));
      expect(within(dialog).getByRole('textbox', { name: 'Dias antes ou depois' })).toHaveValue(
        '2',
      );
      expect(await within(dialog).findByRole('list', { name: 'Próximas datas' })).toBeVisible();
    });

    it('reads the rule as one sentence that follows the chosen type, in the words of the lists', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });
      const sentence = () => within(dialog).getByRole('group', { name: /^Regra: / });

      expect(sentence()).toHaveAccessibleName('Regra: Todo dia 15');
      expect(sentence()).toHaveTextContent('Todo dia');

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Dia útil' }));
      expect(sentence()).toHaveAccessibleName('Regra: No 5º dia útil');

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Perto do dia' }));
      expect(sentence()).toHaveAccessibleName('Regra: Perto do dia 15, até 2 dias antes ou depois');

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Qualquer dia' }));
      expect(sentence()).toHaveAccessibleName(
        'Regra: Em qualquer dia do mês, geralmente no dia 15',
      );
    });

    it('keeps the box of the next dates in every rule type, with the window for "Perto do dia"', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Perto do dia' }));
      const dates = await within(dialog).findByRole('list', { name: 'Próximas datas' });
      const first = within(dates).getAllByRole('listitem')[0];

      expect(first).toHaveAccessibleName(/pode chegar de .* a /);
      expect(
        within(dialog).getAllByRole('radio', {
          name: /Dia fixo|Dia útil|Perto do dia|Qualquer dia/,
        }),
      ).toHaveLength(4);
    });

    it('offers the weekend and holiday choice only to "Dia fixo", "No dia" chosen, and a hint in the others', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });
      const choice = () =>
        within(dialog).queryByRole('radiogroup', { name: /fim de semana ou feriado/ });

      expect(choice()).toBeInTheDocument();
      expect(within(dialog).getByRole('radio', { name: 'No dia' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(within(dialog).getByRole('radio', { name: 'Útil antes' })).toBeInTheDocument();
      expect(within(dialog).getByRole('radio', { name: 'Útil depois' })).toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Dia útil' }));
      expect(choice()).not.toBeInTheDocument();
      expect(
        within(dialog).getByText('Fim de semana e feriado nacional não contam como dia útil.'),
      ).toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Dia fixo' }));
      expect(choice()).toBeInTheDocument();
    });

    it('writes the shift in the sentence and in the next dates: Sunday 10/01/2027 shows on 11 jan', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Dia do mês' }), {
        target: { value: '10' },
      });
      await userEvent.click(within(dialog).getByRole('radio', { name: 'Útil depois' }));

      expect(within(dialog).getByRole('group', { name: /^Regra: / })).toHaveAccessibleName(
        'Regra: Todo dia 10, ou o dia útil seguinte',
      );
      const thirdDate = async () =>
        within(await within(dialog).findByRole('list', { name: 'Próximas datas' })).getAllByRole(
          'listitem',
        )[2];
      await waitFor(async () => {
        expect(await thirdDate()).toHaveAccessibleName(/segunda-feira, 11 de janeiro, era domingo/);
      });
      expect(await thirdDate()).toHaveTextContent('seg, 11 jan');
      expect(await thirdDate()).toHaveTextContent('era domingo');

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Útil antes' }));
      await waitFor(async () => {
        expect(await thirdDate()).toHaveAccessibleName(/sexta-feira, 8 de janeiro, era domingo/);
      });
    });

    it('sends the shift when it saves', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome' }), {
        target: { value: 'Condomínio' },
      });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Valor esperado' }), {
        target: { value: '45000' },
      });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Dia do mês' }), {
        target: { value: '10' },
      });
      await userEvent.click(within(dialog).getByRole('radio', { name: 'Útil depois' }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar recorrência' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      const saved = (
        (await callApi('GET', `/recurrences?month=${CURRENT_MONTH}`)).json as {
          items: { name: string; dateRule: { nonBusinessDayShift: string | null } }[];
        }
      ).items.find((item) => item.name === 'Condomínio');
      expect(saved?.dateRule.nonBusinessDayShift).toBe('after');
    });

    it('shows the accounts as chips with the bank mark', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      const nubank = await within(dialog).findByRole('radio', { name: 'Nubank' });
      expect(nubank.closest('label')?.querySelector('span[aria-hidden]')).not.toBeNull();
    });

    it('asks the regime only for income, inside "Mais opções"', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });
      expect(within(dialog).getByText('Para quem')).toBeInTheDocument();
      expect(within(dialog).queryByText('Regime')).not.toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('radio', { name: 'Receita' }));

      expect(within(dialog).getByText('Vem de quem')).toBeInTheDocument();
      expect(within(dialog).getByText('Regime')).toBeInTheDocument();
    });

    it('shows the most used categories as chips and searches the rest from "Outras…"', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      await userEvent.click(await within(dialog).findByRole('radio', { name: 'Outras…' }));

      expect(
        await within(dialog).findByRole('combobox', { name: 'Buscar outra categoria' }),
      ).toBeInTheDocument();
    });
  });

  describe('"Editar recorrência" (?edit=<id>)', () => {
    it('opens from the menu with the saved values and the history, and saves only what changed', async () => {
      renderApp(URL);
      const expenses = within(await screen.findByRole('region', { name: 'Despesas fixas' }));

      fireEvent.click(await expenses.findByRole('button', { name: 'Ações de Plano celular' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));

      expect(await screen.findByDisplayValue('Plano celular')).toBeInTheDocument();
      const dialog = screen.getByRole('dialog', { name: 'Editar recorrência' });
      expect(window.location.search).toContain('edit=');
      expect(within(dialog).getByDisplayValue('TELECEL')).toBeInTheDocument();
      expect(within(dialog).getByText(/^Confirmada em /)).toBeInTheDocument();

      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome' }), {
        target: { value: 'Plano celular família' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(await expenses.findByText('Plano celular família')).toBeInTheDocument();
    });

    it('loads the saved shift of a fixed day', async () => {
      const list = (await callApi('GET', `/recurrences?month=${CURRENT_MONTH}`)).json as {
        items: { id: string; name: string; dateRule: Record<string, unknown> }[];
      };
      const plan = list.items.find((item) => item.name === 'Plano celular');
      await callApi('PATCH', `/recurrences/${plan?.id}`, {
        dateRule: { ...plan?.dateRule, nonBusinessDayShift: 'before' },
      });

      renderApp(URL);
      const expenses = within(await screen.findByRole('region', { name: 'Despesas fixas' }));
      fireEvent.click(await expenses.findByRole('button', { name: 'Ações de Plano celular' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));
      expect(await screen.findByDisplayValue('Plano celular')).toBeInTheDocument();
      const dialog = screen.getByRole('dialog', { name: 'Editar recorrência' });

      expect(await within(dialog).findByRole('radio', { name: 'Útil antes' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(within(dialog).getByRole('group', { name: /^Regra: / })).toHaveAccessibleName(
        /, ou o dia útil anterior$/,
      );
    });

    it('pauses from the modal and the recurrence moves to "Fora deste mês"', async () => {
      renderApp(URL);
      const expenses = within(await screen.findByRole('region', { name: 'Despesas fixas' }));
      fireEvent.click(await expenses.findByRole('button', { name: 'Ações de Plano celular' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));

      // "Pausar" lives in "Mais opções", which is closed (inert) until opened.
      fireEvent.click(await screen.findByRole('button', { name: /Mais opções/ }));
      fireEvent.click(await screen.findByRole('button', { name: 'Pausar' }));

      expect(await screen.findByText(/Plano celular pausada/)).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('shows the empty state and opens the new-recurrence modal from it', async () => {
      server.use(http.get('/api/recurrences', () => HttpResponse.json({ items: [] })));
      renderApp(URL);

      expect(await screen.findByText('Nenhuma recorrência ainda')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar recorrência' }));

      expect(await screen.findByRole('dialog', { name: 'Nova recorrência' })).toBeInTheDocument();
      expect(window.location.search).toContain('new=recurrence');
    });

    it('shows the error with "Tentar de novo" and recovers', async () => {
      server.use(
        http.get('/api/recurrences', () =>
          HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Falhou' }, { status: 500 }),
        ),
      );
      renderApp(URL);

      expect(await screen.findByText('Não deu para carregar as recorrências')).toBeInTheDocument();
      server.resetHandlers();
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(await screen.findByRole('region', { name: 'Despesas fixas' })).toBeInTheDocument();
    });

    it('keeps the chosen day in the URL', async () => {
      renderApp(URL);
      await screen.findByRole('region', { name: 'Despesas fixas' });

      const selected = screen
        .getAllByRole('option')
        .find((option) => option.getAttribute('aria-selected') === 'true')!;
      selected.focus();
      fireEvent.keyDown(selected, { key: 'ArrowLeft' });

      await waitFor(() => expect(window.location.search).toContain('day='));
    });
  });
});
