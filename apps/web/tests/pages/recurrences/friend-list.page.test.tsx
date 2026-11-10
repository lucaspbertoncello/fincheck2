import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

// The tests type into forms and wait for the whole shell: slow when the full suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const URL = `/recurrences/friends?month=${CURRENT_MONTH}`;
const LONG_WAIT = { timeout: 5000 };

// The seed has two friend debts: Rafa (you owe R$ 420,00, R$ 150,00 paid: R$ 270,00 left) and
// Júlia (she owes R$ 116,00, R$ 58,00 paid: R$ 58,00 left; it came from a dinner transaction).

async function openFriends(search = '') {
  renderApp(`${URL}${search}`);
  await screen.findByRole('button', { name: 'Dívidas de Rafa' }, LONG_WAIT);
}

function personRow(name: string): HTMLElement {
  const row = screen.getByRole('button', { name: `Dívidas de ${name}` }).closest('li');
  if (!row) throw new Error(`No row for ${name}`);
  return row;
}

async function openPerson(name: string) {
  fireEvent.click(screen.getByRole('button', { name: `Dívidas de ${name}` }));
  return screen.findByRole('group', { name: `Dívidas de ${name}` });
}

async function pickDebtMenu(debt: string, item: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Ações de ${debt}` }));
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

function sectionButton(name: string): HTMLElement {
  const section = screen.getByRole('heading', { name: 'Pessoas' }).closest('section');
  if (!section) throw new Error('No section of people');
  return within(section).getByRole('button', { name });
}

async function debtId(description: string): Promise<string> {
  const { json } = await callApi('GET', '/bills?kind=friend&status=all');
  const bill = (json as { items: { id: string; description: string }[] }).items.find(
    (item) => item.description === description,
  );
  if (!bill) throw new Error(`No debt ${description}`);
  return bill.id;
}

describe('FriendListPage', () => {
  it('shows the four sub-tabs of Recorrentes, Amigos the current one', async () => {
    await openFriends();

    const nav = screen.getByRole('navigation', { name: 'Seções de Recorrentes' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Recorrências', 'A pagar e receber', 'Assinaturas', 'Amigos']);
    expect(within(nav).getByRole('link', { name: 'Amigos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Amigos' })).toHaveAttribute(
      'href',
      `/recurrences/friends?month=${CURRENT_MONTH}`,
    );
  });

  it('lists each person with the balance and who owes whom, the biggest first', async () => {
    await openFriends();

    const rows = within(screen.getByRole('heading', { name: 'Pessoas' }).closest('section')!)
      .getAllByRole('button', { name: /^Dívidas de / })
      .map((button) => button.closest('li') as HTMLElement);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Rafa');
    expect(rows[0]).toHaveTextContent('você deve');
    expect(rows[0]).toHaveTextContent('270,00');
    expect(rows[0]).toHaveTextContent('1 dívida em aberto');
    expect(rows[1]).toHaveTextContent('Júlia');
    expect(rows[1]).toHaveTextContent('te deve');
    expect(rows[1]).toHaveTextContent('58,00');
  });

  it('opens a person to show the debts: what, when, the value and what is left', async () => {
    await openFriends();
    const toggle = screen.getByRole('button', { name: 'Dívidas de Rafa' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const group = await openPerson('Rafa');

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const debt = within(group).getByText('Ingresso do show').closest('li') as HTMLElement;
    expect(debt).toHaveTextContent('Dívida');
    expect(debt).toHaveTextContent(/Vence \d{2}\/\d{2}/);
    expect(debt).toHaveTextContent(/falta/);
    expect(debt).toHaveTextContent('150,00');
    expect(within(debt).getByRole('button', { name: 'Ações de Ingresso do show' })).toBeVisible();
    // Júlia stays folded
    expect(screen.getByRole('button', { name: 'Dívidas de Júlia' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens the same form as the "+" from "Nova dívida", and the new debt shows up', async () => {
    await openFriends();

    fireEvent.click(sectionButton('Nova dívida'));
    const dialog = await screen.findByRole('dialog', { name: 'Dívida com amigo' });
    fireEvent.change(within(dialog).getByLabelText('Valor total'), { target: { value: '9000' } });
    fireEvent.change(within(dialog).getByLabelText('O que foi'), { target: { value: 'Uber' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rafa' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar dívida' }));

    expect(await screen.findByText('Dívida "Uber" criada.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).not.toContain('new=');
    // Rafa now has two open debts and you owe R$ 360,00 in all
    await waitFor(() => expect(personRow('Rafa')).toHaveTextContent('360,00'));
    expect(personRow('Rafa')).toHaveTextContent('2 dívidas em aberto');
  });

  it('has the "+" of the shell open the same form without leaving the tab', async () => {
    await openFriends();
    const section = screen.getByRole('heading', { name: 'Pessoas' }).closest('section');
    const plus = screen
      .getAllByRole('button', { name: 'Nova dívida' })
      .find((button) => !section?.contains(button));
    if (!plus) throw new Error('The shell has no "+" on this tab');

    fireEvent.click(plus);

    expect(await screen.findByRole('dialog', { name: 'Dívida com amigo' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/recurrences/friends');
    expect(window.location.search).toContain('new=debt');
  });

  it('starts the new debt with the person filled in when the button is inside the person', async () => {
    await openFriends();
    const group = await openPerson('Júlia');

    fireEvent.click(within(group).getByRole('button', { name: 'Nova dívida' }));

    const dialog = await screen.findByRole('dialog', { name: 'Dívida com amigo' });
    expect(window.location.search).toContain('friend=');
    expect(await within(dialog).findByRole('button', { name: 'Júlia' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dialog).getByRole('button', { name: 'Rafa' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).not.toContain('friend=');
  });

  it('edits a debt in the same form, filled in, and the balance follows', async () => {
    await openFriends();
    await openPerson('Rafa');

    await pickDebtMenu('Ingresso do show', 'Editar');

    const dialog = await screen.findByRole('dialog', { name: 'Editar dívida com amigo' });
    expect(within(dialog).getByLabelText('O que foi')).toHaveValue('Ingresso do show');
    expect(within(dialog).getByLabelText('Valor total')).toHaveValue('420,00');
    expect(within(dialog).getByRole('radio', { name: 'Eu devo' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Eu devo' })).toBeDisabled();
    expect(await within(dialog).findByRole('button', { name: 'Rafa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.change(within(dialog).getByLabelText('Valor total'), { target: { value: '50000' } });
    fireEvent.change(within(dialog).getByLabelText('O que foi'), {
      target: { value: 'Ingresso do show, pista' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar dívida' }));

    expect(await screen.findByText('Dívida "Ingresso do show, pista" salva.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).not.toContain('debt=');
    await waitFor(() => expect(personRow('Rafa')).toHaveTextContent('350,00'));
  });

  it('refuses a value below what was already paid, next to the field', async () => {
    await openFriends();
    await openPerson('Rafa');
    await pickDebtMenu('Ingresso do show', 'Editar');
    const dialog = await screen.findByRole('dialog', { name: 'Editar dívida com amigo' });

    fireEvent.change(within(dialog).getByLabelText('Valor total'), { target: { value: '10000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar dívida' }));

    expect(
      await within(dialog).findByText('O valor não pode ficar abaixo do que já foi pago'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Editar dívida com amigo' })).toBeInTheDocument();
  });

  it('opens the transaction a debt came from instead of the form: that is where it is undone', async () => {
    await openFriends();
    await openPerson('Júlia');

    await pickDebtMenu('Jantar na Nonna', 'Editar');

    await waitFor(() => expect(window.location.pathname).toBe('/transactions'), LONG_WAIT);
    expect(window.location.search).toContain('edit=');
    expect(window.location.search).not.toContain('debt=');
    expect(await screen.findByRole('dialog', undefined, LONG_WAIT)).toBeInTheDocument();
  });

  it('asks before deleting, says there is no undo, and the person leaves when it was the only debt', async () => {
    await openFriends();
    await openPerson('Rafa');

    await pickDebtMenu('Ingresso do show', 'Excluir');

    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir esta dívida?' });
    expect(dialog).toHaveTextContent('A dívida com Rafa some e não dá para desfazer.');
    // Rafa has a Pix tied to a transaction, and no origin
    expect(dialog).toHaveTextContent(
      'Os pagamentos ligados a transações voltam a ser transações comuns.',
    );
    expect(dialog).not.toHaveTextContent('transação de origem');
    // Cancel keeps everything
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await debtId('Ingresso do show')).toBeTruthy();

    await pickDebtMenu('Ingresso do show', 'Excluir');
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Excluir' }),
    );

    expect(await screen.findByText('Dívida com Rafa excluída.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Dívidas de Rafa' })).toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'Dívidas de Júlia' })).toBeInTheDocument();
    await expect(debtId('Ingresso do show')).rejects.toThrow('No debt');
  });

  it('says what the delete gives back to the origin transaction and to the linked Pix', async () => {
    await openFriends();
    await openPerson('Júlia');

    await pickDebtMenu('Jantar na Nonna', 'Excluir');

    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir esta dívida?' });
    expect(dialog).toHaveTextContent('A dívida com Júlia some e não dá para desfazer.');
    expect(dialog).toHaveTextContent(
      'A transação de origem volta a ser despesa inteira, sem categoria.',
    );
    expect(dialog).toHaveTextContent(
      'Os pagamentos ligados a transações voltam a ser transações comuns.',
    );
  });

  it('says only the first sentence when the debt touched no transaction', async () => {
    const created = await callApi('POST', '/bills', {
      direction: 'receivable',
      kind: 'friend',
      description: 'Café',
      counterparty: 'Bia',
      amountCents: 1_500,
    });
    expect(created.status).toBe(201);
    renderApp(URL);
    await screen.findByRole('button', { name: 'Dívidas de Bia' }, LONG_WAIT);
    await openPerson('Bia');

    await pickDebtMenu('Café', 'Excluir');

    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir esta dívida?' });
    expect(dialog.textContent).toContain('A dívida com Bia some e não dá para desfazer.');
    expect(dialog.textContent).not.toContain('origem');
    expect(dialog.textContent).not.toContain('pagamentos ligados');
  });

  it('has no month picker: the debts do not depend on the month', async () => {
    await openFriends();

    expect(screen.queryByRole('group', { name: 'Mês' })).toBeNull();
  });

  it('registers a payment of a debt you owe, from the menu, and the balance follows', async () => {
    await openFriends();
    await openPerson('Rafa');

    await pickDebtMenu('Ingresso do show', 'Registrar pagamento');

    const dialog = await screen.findByRole('dialog', { name: 'Registrar pagamento' });
    expect(window.location.search).toContain('pay=bill');
    fireEvent.change(within(dialog).getByLabelText('Quanto você pagou'), {
      target: { value: '10000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar pagamento' }));

    expect(
      await screen.findByText('Pagamento de Ingresso do show registrado.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).not.toContain('pay=');
    await waitFor(() => expect(personRow('Rafa')).toHaveTextContent('170,00'));
  });

  it('says "Registrar recebimento" in the menu of a debt the friend owes', async () => {
    await openFriends();
    await openPerson('Júlia');

    await pickDebtMenu('Jantar na Nonna', 'Registrar recebimento');

    expect(
      await screen.findByRole('dialog', { name: 'Registrar recebimento' }),
    ).toBeInTheDocument();
  });

  it('shows a person with nothing open as "quite", after the others', async () => {
    const rafa = await debtId('Ingresso do show');
    await callApi('POST', `/bills/${rafa}/payments`, {
      amountCents: 27_000,
      paidOn: `${CURRENT_MONTH}-05`,
    });
    await openFriends();

    const rows = within(screen.getByRole('heading', { name: 'Pessoas' }).closest('section')!)
      .getAllByRole('button', { name: /^Dívidas de / })
      .map((button) => button.closest('li') as HTMLElement);
    expect(rows[0]).toHaveTextContent('Júlia');
    expect(rows[1]).toHaveTextContent('Rafa');
    expect(rows[1]).toHaveTextContent('quite');
    expect(rows[1]).toHaveTextContent('1 dívida quitada');
    // The settled debt is still there, with its status, when the person is opened
    const group = await openPerson('Rafa');
    expect(within(group).getByText('Ingresso do show').closest('li')).toHaveTextContent(
      /Recebido|Paga em/,
    );
    expect(within(group).queryByRole('menuitem', { name: 'Registrar pagamento' })).toBeNull();
  });

  it('opens the person of ?person=, whatever the case and the accents', async () => {
    await openFriends('&person=julia');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Dívidas de Júlia' })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );
    expect(screen.getByRole('button', { name: 'Dívidas de Rafa' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(await screen.findByText('Jantar na Nonna')).toBeInTheDocument();
  });

  it('ignores a ?person= nobody has', async () => {
    await openFriends('&person=Fulano');

    expect(screen.getByRole('button', { name: 'Dívidas de Rafa' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Dívidas de Júlia' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('shows the empty state with "Nova dívida" when there is no friend debt', async () => {
    server.use(http.get('/api/bills', () => HttpResponse.json({ items: [] })));
    renderApp(URL);

    expect(
      await screen.findByRole('heading', { name: 'Nenhuma dívida com amigos ainda' }, LONG_WAIT),
    ).toBeInTheDocument();
    const empty = screen.getByRole('heading', {
      name: 'Nenhuma dívida com amigos ainda',
    }).parentElement!;
    fireEvent.click(within(empty).getByRole('button', { name: 'Nova dívida' }));
    expect(await screen.findByRole('dialog', { name: 'Dívida com amigo' })).toBeInTheDocument();
  });

  it('shows the error with "Tentar de novo", and recovers', async () => {
    server.use(
      http.get(
        '/api/bills',
        () => HttpResponse.json({ code: 'BOOM', message: 'x' }, { status: 500 }),
        {
          once: true,
        },
      ),
    );
    renderApp(URL);

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }, LONG_WAIT));

    expect(
      await screen.findByRole('button', { name: 'Dívidas de Rafa' }, LONG_WAIT),
    ).toBeInTheDocument();
  });
});
