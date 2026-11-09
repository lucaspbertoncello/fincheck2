import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const QUEUE_URL = '/transactions/review?month=2026-10';
const SAVE_LABEL = 'Salvar e ir para a próxima';

async function openQueue() {
  renderApp(QUEUE_URL);
  return screen.findByRole('region', { name: 'Transação em revisão' });
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));
}

describe('ReviewQueuePage', () => {
  it('opens at /transactions/review with its header, the month picker and the Transações tab marked', async () => {
    renderApp('/transactions/review');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Para revisar' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Mês' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Transações' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('keeps the month in the URL', async () => {
    renderApp('/transactions/review?month=2026-10');
    await screen.findByRole('heading', { level: 1, name: 'Para revisar' });

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));

    expect(await screen.findByText('Setembro')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/transactions/review');
    expect(window.location.search).toBe('?month=2026-09');
  });

  it('shows the oldest transaction on the card, its suggestion selected, and the rest in "Na fila"', async () => {
    const card = await openQueue();

    expect(within(card).getByRole('heading', { name: 'PIX LANCHONETE ZE' })).toBeInTheDocument();
    expect(within(card).getByText(/Pix, 13\/10/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Restaurantes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('progressbar', { name: 'Progresso da revisão' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(screen.getByText('0 de 4 revisadas')).toBeInTheDocument();
    const queue = screen.getByRole('list', { name: 'Na fila' });
    expect(within(queue).getAllByRole('listitem')).toHaveLength(3);
    expect(within(queue).getByText('UBER *TRIP')).toBeInTheDocument();
  });

  it('saves with the rule, moves to the next one, advances the progress and offers to undo', async () => {
    await openQueue();

    save();

    expect(await screen.findByText('1 de 4 revisadas')).toBeInTheDocument();
    expect(
      await screen.findByText('PIX LANCHONETE ZE salva em Restaurantes, com regra'),
    ).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Transação em revisão' });
    expect(within(card).getByRole('heading', { name: 'PIX JOSE C SILVA' })).toBeInTheDocument();
  });

  it('undoes the save and the transaction comes back to the card', async () => {
    await openQueue();
    save();
    await screen.findByText('PIX LANCHONETE ZE salva em Restaurantes, com regra');

    fireEvent.click(screen.getByText('Desfazer'));

    expect(await screen.findByText('0 de 4 revisadas')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Transação em revisão' });
    expect(
      await within(card).findByRole('heading', { name: 'PIX LANCHONETE ZE' }),
    ).toBeInTheDocument();
  });

  it('skips to the next and sends the skipped one to the end of the queue', async () => {
    const card = await openQueue();

    fireEvent.click(within(card).getByRole('button', { name: 'Pular' }));

    expect(
      await within(card).findByRole('heading', { name: 'PIX JOSE C SILVA' }),
    ).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Na fila' })).getAllByRole('listitem');
    expect(items.at(-1)).toHaveTextContent('PIX LANCHONETE ZE');
    expect(screen.getByText('0 de 4 revisadas')).toBeInTheDocument();
  });

  it('goes back to the last saved one, with the saved category selected', async () => {
    await openQueue();
    save();
    await screen.findByText('1 de 4 revisadas');
    const card = screen.getByRole('region', { name: 'Transação em revisão' });

    fireEvent.click(within(card).getByRole('button', { name: 'Voltar à anterior' }));

    expect(
      await within(card).findByRole('heading', { name: 'PIX LANCHONETE ZE' }),
    ).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Restaurantes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('1 de 4 revisadas')).toBeInTheDocument();
  });

  it('needs a category: with no suggestion "Salvar" waits, and "Outra" opens the full choice', async () => {
    const card = await openQueue();
    fireEvent.click(within(card).getByRole('button', { name: 'Pular' }));
    await within(card).findByRole('heading', { name: 'PIX JOSE C SILVA' });
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeDisabled();

    fireEvent.click(within(card).getByRole('button', { name: 'Outra' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Compras' }));

    expect(
      await within(card).findByRole('button', { name: 'Compras', pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeEnabled();
  });

  it('offers the category that is a transfer to an incoming transaction too (the other leg of a rotation)', async () => {
    const incoming = db.transactions.find((tx) => tx.description === 'PIX LANCHONETE ZE');
    if (!incoming) throw new Error('seed without PIX LANCHONETE ZE');
    incoming.nature = 'income';
    incoming.amountCents = Math.abs(incoming.amountCents);
    const card = await openQueue();

    fireEvent.click(within(card).getByRole('button', { name: 'Outra' }));

    expect(await screen.findByRole('button', { name: 'Rotação entre contas' })).toBeInTheDocument();
  });

  describe('a credit on a card (a refund)', () => {
    // The oldest of the month, so it is the one on the card.
    function addRefund() {
      const card = db.accounts.find((account) => account.creditCard);
      if (!card) throw new Error('seed without a card');
      const refund = makeTransactionRecord({
        accountId: card.id,
        method: 'credit',
        description: 'ESTORNO LOJA TESTE',
        amountCents: 5990,
        occurredOn: `${CURRENT_MONTH}-01`,
        nature: 'expense',
        invoiceMonth: CURRENT_MONTH,
      });
      db.transactions.push(refund);

      return refund;
    }

    it('offers "Abate gasto" first and "Conta como receita" after, with their lines', async () => {
      addRefund();
      const card = await openQueue();
      await within(card).findByRole('heading', { name: 'ESTORNO LOJA TESTE' });

      fireEvent.click(within(card).getByRole('button', { name: 'Outra' }));
      const groups = await screen.findAllByRole('group', {
        name: /^(Abate gasto|Conta como receita)$/,
      });

      expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual([
        'Abate gasto',
        'Conta como receita',
      ]);
      expect(within(groups[0]!).getByRole('button', { name: 'Compras' })).toBeInTheDocument();
      expect(within(groups[0]!).queryByRole('button', { name: 'Salário' })).not.toBeInTheDocument();
      expect(within(groups[1]!).getByRole('button', { name: 'Salário' })).toBeInTheDocument();
      expect(screen.getByText('O crédito reduz o gasto da categoria e a fatura.')).toBeVisible();
      expect(
        screen.getByText('O crédito vira receita do mês e também reduz a fatura.'),
      ).toBeVisible();
    });

    it('saves it as income with a category of income, saying so on the card', async () => {
      const refund = addRefund();
      const card = await openQueue();
      await within(card).findByRole('heading', { name: 'ESTORNO LOJA TESTE' });

      fireEvent.click(within(card).getByRole('button', { name: 'Outra' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Salário' }));
      expect(await within(card).findByText(/^Conta como receita: /)).toBeInTheDocument();
      save();

      await waitFor(() => expect(refund.nature).toBe('income'));
      expect(db.categories.find((category) => category.id === refund.categoryId)?.name).toBe(
        'Salário',
      );
    });

    it('keeps it an expense with a category of expense', async () => {
      const refund = addRefund();
      const card = await openQueue();
      await within(card).findByRole('heading', { name: 'ESTORNO LOJA TESTE' });

      fireEvent.click(within(card).getByRole('button', { name: 'Outra' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Compras' }));
      expect(await within(card).findByText(/^Abate gasto: /)).toBeInTheDocument();
      save();

      await waitFor(() => expect(refund.categoryId).not.toBeNull());
      expect(refund.nature).toBe('expense');
    });

    // What Lucas chose by hand for the same description is the history the queue suggests from.
    function addHistory(description: string, categoryName: string) {
      const category = db.categories.find((entry) => entry.name === categoryName);
      const account = db.accounts.find((entry) => !entry.creditCard);
      if (!category || !account) throw new Error('seed without the category or an account');
      db.transactions.push(
        makeTransactionRecord({
          accountId: account.id,
          method: 'pix',
          description,
          amountCents: category.kind === 'income' ? 1000 : -1000,
          occurredOn: `${CURRENT_MONTH}-02`,
          categoryId: category.id,
          categorySource: 'user',
          nature: category.kind,
        }),
      );
    }

    it('never marks "Conta como receita" for one click: an income suggestion is not offered on a refund', async () => {
      addRefund();
      addHistory('ESTORNO LOJA TESTE', 'Salário');
      const card = await openQueue();
      await within(card).findByRole('heading', { name: 'ESTORNO LOJA TESTE' });

      expect(within(card).queryByRole('button', { name: 'Salário' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeDisabled();
    });

    it('marks "Abate gasto" when the history of the description is a category of expense', async () => {
      addRefund();
      addHistory('ESTORNO LOJA TESTE', 'Compras');
      const card = await openQueue();
      await within(card).findByRole('heading', { name: 'ESTORNO LOJA TESTE' });

      expect(
        await within(card).findByRole('button', { name: 'Compras', pressed: true }),
      ).toBeInTheDocument();
      expect(within(card).getByRole('group', { name: 'Categoria' })).toHaveAccessibleDescription(
        /^Abate gasto: /,
      );
    });

    it('keeps the groups for a refund on an archived card', async () => {
      const refund = addRefund();
      const account = db.accounts.find((entry) => entry.id === refund.accountId);
      if (!account) throw new Error('seed without the card');
      account.archivedAt = '2026-09-01T00:00:00.000Z';
      const card = await openQueue();
      await within(card).findByRole('heading', { name: 'ESTORNO LOJA TESTE' });

      fireEvent.click(within(card).getByRole('button', { name: 'Outra' }));

      expect(await screen.findByRole('group', { name: /^Abate gasto/ })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Conta como receita' })).toHaveAccessibleDescription(
        'O crédito vira receita do mês e também reduz a fatura.',
      );
    });

    it('lists no groups for an ordinary transaction', async () => {
      const card = await openQueue();

      fireEvent.click(within(card).getByRole('button', { name: 'Outra' }));
      await screen.findByRole('button', { name: 'Compras' });

      expect(screen.queryByText('Abate gasto')).not.toBeInTheDocument();
      expect(within(card).queryByText(/^Abate gasto: /)).not.toBeInTheDocument();
    });
  });

  it('shows "Tudo revisado" when the queue is empty and goes back to the transactions', async () => {
    server.use(
      http.get('/api/transactions/review-queue', () => HttpResponse.json({ total: 0, items: [] })),
    );
    renderApp(QUEUE_URL);

    expect(await screen.findByRole('heading', { name: 'Tudo revisado' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para transações' }));

    await waitFor(() => expect(window.location.pathname).toBe('/transactions'));
  });

  it('tells the failure and tries again', async () => {
    let failing = true;
    server.use(
      http.get('/api/transactions/review-queue', () =>
        failing
          ? HttpResponse.json({ code: 'INTERNAL', message: 'Falhou' }, { status: 500 })
          : HttpResponse.json({ total: 0, items: [] }),
      ),
    );
    renderApp(QUEUE_URL);
    expect(await screen.findByText('Não deu para carregar a fila')).toBeInTheDocument();

    failing = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('heading', { name: 'Tudo revisado' })).toBeInTheDocument();
  });

  it('keeps the card and says so when the save fails', async () => {
    server.use(
      http.patch('/api/transactions/:id', () =>
        HttpResponse.json({ code: 'TRANSACTION_NOT_FOUND', message: 'Sumiu' }, { status: 404 }),
      ),
    );
    await openQueue();

    save();

    expect(await screen.findByText('Sumiu')).toBeInTheDocument();
    expect(screen.getByText('0 de 4 revisadas')).toBeInTheDocument();
  });
});
