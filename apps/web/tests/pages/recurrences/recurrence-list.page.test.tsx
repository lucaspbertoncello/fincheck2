import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';
import { server } from '#mocks/setup/server.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/clock.constant.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';

resetDatabaseBeforeEach();

const URL = `/recurrences?month=${CURRENT_MONTH}`;

async function findAttentionStrip() {
  return within(await screen.findByRole('region', { name: 'Precisa de você' }));
}

describe('RecurrenceListPage', () => {
  it('shows the month: what needs you, the cards, the strip and both lists', async () => {
    renderApp(URL);

    const attention = await findAttentionStrip();
    expect(attention.getByText('Diarista')).toBeInTheDocument();
    expect(attention.getByText('Internet')).toBeInTheDocument();
    expect(attention.getAllByText('Atrasado').length).toBeGreaterThan(0);
    expect(attention.getByText('Valor diferente')).toBeInTheDocument();

    expect(screen.getByText(/^Receitas esperadas em /)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /, dia a dia$/ })).toBeInTheDocument();

    const incomes = within(screen.getByRole('region', { name: 'Receitas' }));
    expect(incomes.getByText('Mesada')).toBeInTheDocument();
    expect(incomes.getByText('Parcial')).toBeInTheDocument();
    expect(incomes.getByText('Salário Alvorada, dia 15')).toBeInTheDocument();

    const expenses = within(screen.getByRole('region', { name: 'Despesas fixas' }));
    expect(expenses.getByText('Academia')).toBeInTheDocument();
    expect(expenses.getByText('Plano celular')).toBeInTheDocument();
    expect(expenses.queryByText('Diarista')).not.toBeInTheDocument();
  });

  it('marks the late occurrence as paid, moves it to the list and offers to undo', async () => {
    renderApp(URL);
    const attention = await findAttentionStrip();

    fireEvent.click(attention.getByRole('button', { name: 'Marcar como paga' }));

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

  it('answers the different amount with "Atualizar" and the row leaves the strip', async () => {
    renderApp(URL);
    const attention = await findAttentionStrip();

    fireEvent.click(attention.getByRole('button', { name: 'Atualizar' }));

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
    renderApp(URL);
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
    renderApp(URL);
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
    server.use(http.get('/api/occurrences/:id/candidates', () => HttpResponse.json({ items: [] })));
    renderApp(URL);
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

    fireEvent.click(
      within(attention.getByText('Diarista').closest('li')!).getByRole('button', {
        name: 'Editar valor esperado',
      }),
    );

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
        expect(names.some((name) => !name.closest('[aria-label="Livre até o fim do mês"]'))).toBe(
          true,
        );
      });
    });

    it('shows the error next to each invalid field and keeps the modal open', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

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
        await within(dialog).findByRole('textbox', { name: 'Qual dia útil' }),
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole('textbox', { name: 'Dia do mês' })).not.toBeInTheDocument();
    });
  });

  describe('"Nova recorrência" choices', () => {
    it('opens with the focus on the name and the next dates under the rule', async () => {
      renderApp(`${URL}&new=recurrence`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });

      await waitFor(() =>
        expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveFocus(),
      );
      await userEvent.type(within(dialog).getByRole('textbox', { name: 'Dia do mês' }), '15');

      const trail = await within(dialog).findByRole('list', { name: 'Próximas datas' });
      expect(within(trail).getAllByRole('listitem')).toHaveLength(3);
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

    it('pauses from the modal and the recurrence moves to "Fora deste mês"', async () => {
      renderApp(URL);
      const expenses = within(await screen.findByRole('region', { name: 'Despesas fixas' }));
      fireEvent.click(await expenses.findByRole('button', { name: 'Ações de Plano celular' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));

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

      expect(await screen.findByRole('region', { name: 'Receitas' })).toBeInTheDocument();
    });

    it('keeps the chosen day in the URL', async () => {
      renderApp(URL);
      await screen.findByRole('region', { name: 'Receitas' });

      const selected = screen
        .getAllByRole('option')
        .find((option) => option.getAttribute('aria-selected') === 'true')!;
      selected.focus();
      fireEvent.keyDown(selected, { key: 'ArrowLeft' });

      await waitFor(() => expect(window.location.search).toContain('day='));
    });
  });
});
