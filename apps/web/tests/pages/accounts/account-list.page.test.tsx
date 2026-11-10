import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { sharedCardStore } from '#/router/card-transition/shared-card.store.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';

resetDatabaseBeforeEach();

async function openAccounts(url = '/accounts') {
  renderApp(url);
  await screen.findByRole('heading', { level: 1, name: 'Contas e cartões' });
}

/** Presses a React Aria button: its press handlers answer to a click without pointer events. */
function press(element: HTMLElement) {
  fireEvent.click(element);
}

describe('AccountListPage', () => {
  it('shows the cards with their invoices and the accounts with balance and sync line', async () => {
    await openAccounts();

    expect(await screen.findByRole('heading', { name: 'Cartões de crédito' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Roxinho, final 4821/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Bradesco Black, final 7733/ })).toBeInTheDocument();
    expect(screen.getAllByText('Fatura aberta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fatura fechada').length).toBeGreaterThan(0);

    const nubank = await screen.findByRole('article', { name: 'Nubank' });
    expect(within(nubank).getByText('Open Finance')).toBeInTheDocument();
    expect(within(nubank).getByText(/Atualizado pelo banco há \d+ min/)).toBeInTheDocument();
    expect(within(nubank).getByText(/3\.486,15/)).toBeInTheDocument();

    const carteira = screen.getByRole('article', { name: 'Carteira' });
    expect(within(carteira).getByText('Manual')).toBeInTheDocument();
    expect(within(carteira).getByText('Saldo manual')).toBeInTheDocument();
    expect(within(carteira).getByRole('button', { name: 'Atualizar saldo' })).toBeInTheDocument();
    expect(within(nubank).queryByRole('button', { name: /saldo/ })).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Conectar outra conta/ })).not.toBeInTheDocument();
  });

  it('flags a bank whose data is more than 36 hours old', async () => {
    await openAccounts();

    const bradesco = await screen.findByRole('article', { name: 'Bradesco' });
    expect(within(bradesco).getByText(/Atualizado pelo banco ontem/)).toBeInTheDocument();
  });

  it('shows the error state and loads again on "Tentar de novo"', async () => {
    server.use(
      http.get('/api/accounts', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Erro' }, { status: 500 }),
      ),
    );
    await openAccounts();

    expect(await screen.findByText('Não deu para carregar as contas')).toBeInTheDocument();

    server.resetHandlers();
    press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('heading', { name: 'Cartões de crédito' })).toBeInTheDocument();
  });

  it('shows the empty state with "Conectar conta" when there is no account', async () => {
    server.use(http.get('/api/accounts', () => HttpResponse.json({ items: [] })));
    await openAccounts();

    expect(await screen.findByRole('heading', { name: 'Nenhuma conta ainda' })).toBeInTheDocument();
    const empty = screen.getByRole('heading', { name: 'Nenhuma conta ainda' })
      .parentElement as HTMLElement;
    press(within(empty).getByRole('button', { name: 'Conectar conta' }));

    expect(await screen.findByRole('dialog', { name: 'Conectar banco' })).toBeInTheDocument();
    expect(window.location.search).toContain('new=account');
  });

  it('shows the error strip of a connection with a problem and retries it', async () => {
    const bradesco = db.connections.find((item) => item.institutionName === 'Bradesco');
    if (!bradesco) throw new Error('The seed has no Bradesco connection');
    bradesco.status = 'error';
    bradesco.errorCode = 'LOGIN_ERROR';
    await openAccounts();

    expect(await screen.findByText('Não deu para sincronizar o Bradesco')).toBeInTheDocument();
    const tile = screen.getByRole('article', { name: 'Bradesco' });
    expect(within(tile).getByText(/Conexão com erro/)).toBeInTheDocument();
    expect(within(tile).getByRole('link', { name: 'Reconectar no Open Finance' })).toHaveAttribute(
      'href',
      'https://meu.pluggy.ai',
    );

    press(screen.getByRole('button', { name: 'Buscar de novo' }));
    await waitFor(() => expect(db.runs.some((item) => item.run.trigger === 'retry')).toBe(true));
  });

  it('shows the progress of a first sync while the history is being fetched', async () => {
    const nubank = db.connections.find((item) => item.institutionName === 'Nubank');
    if (!nubank) throw new Error('The seed has no Nubank connection');
    nubank.history = { status: 'running', fromOn: null, transactionCount: 120 };
    await openAccounts();

    expect(await screen.findByText('Buscando o histórico do Nubank')).toBeInTheDocument();
    expect(screen.getByText(/120 transações/)).toBeInTheDocument();
  });

  it('archives an account from its menu and brings it back with Desfazer', async () => {
    await openAccounts();
    await screen.findByRole('article', { name: 'Carteira' });

    press(screen.getByRole('button', { name: 'Ações de Carteira' }));
    press(await screen.findByRole('menuitem', { name: 'Arquivar' }));

    expect(await screen.findByText(/Carteira arquivada/)).toBeInTheDocument();
    const archived = await screen.findByRole('region', { name: 'Arquivadas' });
    expect(await within(archived).findByRole('article', { name: 'Carteira' })).toBeInTheDocument();

    // The toast action keeps the close button's accessible name, so it is found by its text.
    press(screen.getByText('Desfazer'));
    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: 'Arquivadas' })).queryByRole('article', {
          name: 'Carteira',
        }),
      ).not.toBeInTheDocument(),
    );
    expect(db.accounts.find((item) => item.name === 'Carteira')?.archivedAt).toBeNull();
  });

  it('asks for confirmation, with the impact, before deleting an account', async () => {
    await openAccounts();
    await screen.findByRole('article', { name: 'Carteira' });

    press(screen.getByRole('button', { name: 'Ações de Carteira' }));
    press(await screen.findByRole('menuitem', { name: 'Excluir' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir Carteira?' });
    expect(await within(dialog).findByText(/serão apagadas/)).toBeInTheDocument();

    press(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Carteira' })).not.toBeInTheDocument(),
    );
  });

  it('updates the wallet balance from the "Atualizar saldo" modal', async () => {
    await openAccounts();
    const carteira = await screen.findByRole('article', { name: 'Carteira' });

    press(within(carteira).getByRole('button', { name: 'Atualizar saldo' }));

    const dialog = await screen.findByRole('dialog', { name: 'Atualizar saldo' });
    const field = within(dialog).getByRole('textbox', { name: 'Novo saldo' });
    fireEvent.change(field, { target: { value: '9500' } });
    press(within(dialog).getByRole('button', { name: 'Salvar saldo' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Atualizar saldo' })).not.toBeInTheDocument(),
    );
    expect(
      await within(screen.getByRole('article', { name: 'Carteira' })).findByText(/95,00/),
    ).toBeInTheDocument();
  });

  it('opens the invoice of a card with its payment actions', async () => {
    await openAccounts();
    await screen.findByRole('heading', { name: 'Cartões de crédito' });

    press((await screen.findAllByRole('button', { name: 'Ver fatura' }))[0]!);

    // "Ver fatura" is a page now: the address changes and the page names the invoice.
    expect(await screen.findByRole('heading', { level: 1, name: /Fatura de/ })).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/cards\/[^/]+\/invoices\/\d{4}-\d{2}$/);
    expect(await screen.findByRole('heading', { name: 'Lançamentos' })).toBeInTheDocument();
  });

  it('corrects the invoice total and removes the correction', async () => {
    await openAccounts();
    await screen.findByRole('heading', { name: 'Cartões de crédito' });

    press((await screen.findAllByRole('button', { name: 'Corrigir valor' }))[0]!);

    const dialog = await screen.findByRole('dialog', { name: 'Corrigir valor da fatura' });
    const field = await within(dialog).findByRole('textbox', { name: 'Valor correto da fatura' });
    fireEvent.change(field, { target: { value: '100000' } });
    press(within(dialog).getByRole('button', { name: 'Salvar correção' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Corrigir valor da fatura' }),
      ).not.toBeInTheDocument(),
    );
    // Scoped to the "Cartões de crédito" section: the "Livre" panel in the shell repeats amounts.
    const cards = screen.getByRole('heading', { name: 'Cartões de crédito' }).closest('section');
    expect(await within(cards!).findByText(/1\.000,00/)).toBeInTheDocument();
  });

  it('has "Compras parceladas" in each card and it opens the page of the plans of the card', async () => {
    await openAccounts();
    await screen.findByRole('heading', { name: 'Cartões de crédito' });

    press((await screen.findAllByRole('button', { name: 'Compras parceladas' }))[0]!);

    expect(
      await screen.findByRole('heading', { level: 1, name: /Compras parceladas do/ }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/cards\/[^/]+\/installments$/);
  });

  it('keeps "Faturas futuras" beside "Compras parceladas": it swaps the cards for the projection and goes back', async () => {
    await openAccounts();
    await screen.findByRole('heading', { name: 'Cartões de crédito' });
    expect(screen.getAllByRole('button', { name: 'Compras parceladas' }).length).toBeGreaterThan(0);

    press((await screen.findAllByRole('button', { name: 'Faturas futuras' }))[0]!);

    expect(await screen.findByRole('heading', { name: /Faturas futuras do/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cartões de crédito' })).not.toBeInTheDocument();

    press(screen.getByRole('button', { name: 'Voltar aos cartões' }));
    expect(await screen.findByRole('heading', { name: 'Cartões de crédito' })).toBeInTheDocument();
  });
});

describe('AccountListPage, invoice with more refund than purchases (R5)', () => {
  it('shows "crédito de R$ X" in place of the amount', async () => {
    const card = db.accounts.find((item) => item.name === 'Roxinho');
    if (!card) throw new Error('The seed has no Roxinho card');
    server.use(
      http.get('/api/invoices/open', () =>
        HttpResponse.json({
          items: [
            {
              accountId: card.id,
              invoice: {
                accountId: card.id,
                month: '2026-10',
                closesOn: '2026-10-30',
                dueOn: '2026-11-06',
                status: 'open',
                breakdown: {
                  purchasesCents: -4_500,
                  installmentsCents: 0,
                  expectedRecurringCents: 0,
                },
                computedTotalCents: -4_500,
                bankTotalCents: null,
                totalOverrideCents: null,
                overrideNote: null,
                totalCents: -4_500,
                paidCents: 0,
                presumedPaidCents: 0,
                remainingCents: 0,
                payments: [],
                paymentSuggestion: null,
                isEditable: true,
                paidBeforeFincheck: false,
              },
            },
          ],
        }),
      ),
    );
    await openAccounts();

    const invoice = await screen.findByRole('region', { name: 'Fatura aberta' });
    expect(within(invoice).getByText('crédito de')).toBeInTheDocument();
    expect(within(invoice).getByText(/45,00/)).toBeInTheDocument();
  });
});

describe('AccountListPage, card that travels to its invoice', () => {
  beforeEach(() => sharedCardStore.set(null));

  function namedCards() {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-shared-card]'));
  }

  it('names no card until one is clicked', async () => {
    await openAccounts();
    await screen.findByRole('img', { name: /Roxinho, final 4821/ });

    expect(namedCards()).toHaveLength(0);
  });

  it('gives the transition name only to the card that was navigated', async () => {
    const roxinho = db.accounts.find((item) => item.name === 'Roxinho')!;
    sharedCardStore.set(roxinho.id);
    await openAccounts();
    await screen.findByRole('img', { name: /Bradesco Black, final 7733/ });

    const named = namedCards();
    expect(named).toHaveLength(1);
    expect(named[0]!.style.getPropertyValue('--card-vt-name')).toBe(`card-${roxinho.id}`);
    expect(named[0]).toHaveAccessibleName(/Roxinho, final 4821/);
    sharedCardStore.set(null);
  });

  it('marks the clicked card when the invoice opens, from the button and from the card', async () => {
    const roxinho = db.accounts.find((item) => item.name === 'Roxinho')!;
    await openAccounts();
    await screen.findByRole('heading', { name: 'Cartões de crédito' });

    fireEvent.click(await screen.findByRole('button', { name: 'Ver fatura do cartão Roxinho' }));

    expect(await screen.findByRole('heading', { level: 1, name: /Fatura de/ })).toBeInTheDocument();
    expect(sharedCardStore.getSnapshot()).toBe(roxinho.id);
    sharedCardStore.set(null);
  });
});
