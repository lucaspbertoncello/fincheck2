import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const ITEM_ID = '0b9a1c3e-5d27-4f64-8a1e-3c7d9e2f4b66';

async function openAccounts(url = '/accounts') {
  renderApp(url);
  await screen.findByRole('heading', { level: 1, name: 'Contas e cartões' });
}

/** The bank select: opens the list and picks the row by its name. */
async function chooseBank(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  bank: string,
) {
  await user.click(within(dialog).getByRole('button', { name: /Banco/ }));
  await user.click(await screen.findByRole('option', { name: bank }));
}

async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  await user.click(
    await screen.findByRole('button', {
      name: name.startsWith('do cartão') ? `Ações ${name}` : `Ações de ${name}`,
    }),
  );
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

describe('Conectar banco, modal pattern', () => {
  it('walks the three steps of the Open Finance as the connection code is typed', async () => {
    const user = userEvent.setup();
    renderApp('/accounts?new=account');
    const dialog = await screen.findByRole('dialog', { name: 'Conectar banco' });
    const steps = await within(dialog).findByRole('list', {
      name: 'Passos para conectar pelo Open Finance',
    });

    expect(steps.querySelector('[aria-current=step]')).toHaveTextContent('Conecte seu banco');

    await user.click(within(dialog).getByRole('textbox', { name: 'Código da conexão' }));
    await user.paste(ITEM_ID);

    expect(within(steps).getAllByText(/Concluído:/)).toHaveLength(3);
  });

  it('draws the card in the theme of the bank as the person fills the form, and creates it', async () => {
    const user = userEvent.setup();
    renderApp('/accounts?new=account');
    const dialog = await screen.findByRole('dialog', { name: 'Conectar banco' });

    await user.click(within(dialog).getByRole('radio', { name: 'Conta manual' }));
    await user.click(
      within(await within(dialog).findByRole('radiogroup', { name: 'Tipo de conta' })).getByRole(
        'radio',
        { name: 'Cartão de crédito' },
      ),
    );
    await chooseBank(user, dialog, 'Nubank');
    await user.type(within(dialog).getByRole('textbox', { name: 'Apelido do cartão' }), 'Roxo');
    await user.type(within(dialog).getByRole('textbox', { name: 'Dia de fechamento' }), '25');
    await user.type(within(dialog).getByRole('textbox', { name: 'Dia de vencimento' }), '6');

    expect(
      within(dialog).getByRole('img', { name: /Cartão Nubank, Roxo, final ••••, Vence dia 06/ }),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Criar cartão' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Conectar banco' })).not.toBeInTheDocument(),
    );
    const created = db.accounts.find((item) => item.name === 'Roxo');
    expect(created?.creditCard?.closingDay).toBe(25);
    expect(created?.creditCard?.dueDay).toBe(6);
  });

  it('keeps brand, last digits and limit under "Mais opções", and says what they hold', async () => {
    const user = userEvent.setup();
    renderApp('/accounts?new=account');
    const dialog = await screen.findByRole('dialog', { name: 'Conectar banco' });
    await user.click(within(dialog).getByRole('radio', { name: 'Conta manual' }));
    await user.click(
      within(await within(dialog).findByRole('radiogroup', { name: 'Tipo de conta' })).getByRole(
        'radio',
        { name: 'Cartão de crédito' },
      ),
    );

    await user.click(within(dialog).getByRole('button', { name: 'Mais opções' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Final do cartão' }), '1234');
    await user.click(within(dialog).getByRole('button', { name: 'Mais opções' }));

    expect(within(dialog).getByText('Visa · final 1234')).toBeInTheDocument();
  });

  it('edits a card in the same modal, keeps its kind fixed, and "Excluir" goes to the confirmation', async () => {
    const user = userEvent.setup();
    await openAccounts();
    await openMenu(user, 'do cartão Roxinho', 'Editar');

    const dialog = await screen.findByRole('dialog', { name: 'Editar cartão' });
    const name = await within(dialog).findByRole('textbox', { name: 'Apelido do cartão' });
    expect(name).toHaveValue('Roxinho');
    expect(
      within(within(dialog).getByRole('radiogroup', { name: 'Tipo de conta' })).getByRole('radio', {
        name: 'Cartão de crédito',
      }),
    ).toBeDisabled();
    expect(
      within(dialog).queryByRole('radio', { name: 'Banco (Open Finance)' }),
    ).not.toBeInTheDocument();

    await user.clear(name);
    await user.type(name, 'Roxinho Novo');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Editar cartão' })).not.toBeInTheDocument(),
    );
    expect(db.accounts.some((item) => item.name === 'Roxinho Novo')).toBe(true);

    await openMenu(user, 'do cartão Roxinho Novo', 'Editar');
    const again = await screen.findByRole('dialog', { name: 'Editar cartão' });
    await user.click(within(again).getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByRole('alertdialog', { name: 'Excluir Roxinho Novo?' }),
    ).toBeInTheDocument();
  });
});

describe('Ajustar saldo, modal pattern', () => {
  it('shows the difference in words and only lets the person save a different balance', async () => {
    const user = userEvent.setup();
    await openAccounts();
    const carteira = await screen.findByRole('article', { name: 'Carteira' });
    await user.click(within(carteira).getByRole('button', { name: 'Atualizar saldo' }));

    const dialog = await screen.findByRole('dialog', { name: 'Atualizar saldo' });
    const save = within(dialog).getByRole('button', { name: 'Salvar saldo' });
    expect(await within(dialog).findByRole('textbox', { name: 'Novo saldo' })).toBeInTheDocument();
    expect(save).toBeDisabled();
    expect(within(dialog).getByText('Digite um saldo diferente do atual.')).toBeInTheDocument();

    const field = within(dialog).getByRole('textbox', { name: 'Novo saldo' });
    await user.clear(field);
    await user.type(field, '1');

    expect(await within(dialog).findByText(/Vai lançar um ajuste de/)).toBeInTheDocument();
    expect(save).toBeEnabled();
  });
});

describe('Excluir conta, modal pattern', () => {
  it('says what goes and what stays, and offers to archive instead', async () => {
    const user = userEvent.setup();
    await openAccounts();
    await screen.findByRole('article', { name: 'Carteira' });
    await openMenu(user, 'Carteira', 'Excluir');

    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir Carteira?' });
    expect(await within(dialog).findByRole('region', { name: 'O que some' })).toBeInTheDocument();
    expect(within(dialog).getByRole('region', { name: 'O que fica' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Arquivar' }));

    expect(await screen.findByText(/Carteira arquivada/)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { name: 'Excluir Carteira?' }),
      ).not.toBeInTheDocument(),
    );
    expect(db.accounts.find((item) => item.name === 'Carteira')?.archivedAt).not.toBeNull();
  });
});

describe('Fatura, modal pattern', () => {
  it('registers a payment with the date shortcuts and the rest already in the amount', async () => {
    const user = userEvent.setup();
    await openAccounts();
    await screen.findByRole('heading', { name: 'Cartões de crédito' });
    await user.click((await screen.findAllByRole('button', { name: 'Ver fatura' }))[1]!);

    const dialog = await screen.findByRole('dialog', { name: /Fatura de/ });
    await user.click(await within(dialog).findByRole('button', { name: 'Registrar pagamento' }));

    expect(within(dialog).getByRole('textbox', { name: 'Valor pago' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Hoje', pressed: true })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Ontem' }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar pagamento' }));

    await waitFor(() =>
      expect(db.invoices.flatMap((invoice) => invoice.payments).length).toBeGreaterThan(0),
    );
    expect(await within(dialog).findByText(/Pago em/)).toBeInTheDocument();
  });

  it('compares the typed value with what the app calculated when correcting', async () => {
    const user = userEvent.setup();
    await openAccounts();
    await screen.findByRole('heading', { name: 'Cartões de crédito' });
    await user.click((await screen.findAllByRole('button', { name: 'Corrigir valor' }))[0]!);

    const dialog = await screen.findByRole('dialog', { name: 'Corrigir valor da fatura' });
    const field = await within(dialog).findByRole('textbox', { name: 'Valor correto da fatura' });
    expect(within(dialog).getByText('O app calculou (compras e parcelas)')).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, '99999999');

    expect(await within(dialog).findByText(/a mais que o app calculou/)).toBeInTheDocument();
  });
});
