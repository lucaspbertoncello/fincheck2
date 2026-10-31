import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

// userEvent types key by key through the whole app: slow when the full suite runs in parallel
vi.setConfig({ testTimeout: 20_000 });

const URL = `/recurrences/bills?month=${CURRENT_MONTH}`;

async function billIdOf(description: string): Promise<string> {
  const response = await fetch('/api/bills');
  const body = (await response.json()) as { items: { id: string; description: string }[] };
  const bill = body.items.find((item) => item.description === description);
  if (!bill) throw new Error(`No bill ${description}`);
  return bill.id;
}

describe('new bill modal (the form pattern)', () => {
  it('shows the direction, the amount, shortcuts for the date and chips for the category', async () => {
    renderApp(`${URL}&new=bill`);
    const dialog = await screen.findByRole('dialog', { name: 'Nova conta a pagar ou receber' });

    expect(within(dialog).getByRole('radio', { name: 'A pagar' })).toBeChecked();
    expect(within(dialog).getByLabelText('Valor')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Sem vencimento' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dialog).getByRole('button', { name: 'Amanhã' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Em 7 dias' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Outra data' })).toBeInTheDocument();
    // categories are chips (with "Outras…"), not a select
    expect(await within(dialog).findByRole('button', { name: 'Outras…' })).toBeInTheDocument();
  });

  it('refuses an empty bill next to the fields', async () => {
    const user = userEvent.setup();
    renderApp(`${URL}&new=bill`);
    const dialog = await screen.findByRole('dialog', { name: 'Nova conta a pagar ou receber' });

    await user.click(within(dialog).getByRole('button', { name: 'Salvar conta' }));

    expect(await within(dialog).findByText('Informe um valor maior que zero')).toBeInTheDocument();
    expect(within(dialog).getByText('Diga o que é a conta')).toBeInTheDocument();
  });

  it('creates a bill with a due date shortcut, and says when it enters the Livre', async () => {
    const user = userEvent.setup();
    renderApp(`${URL}&new=bill`);
    const dialog = await screen.findByRole('dialog', { name: 'Nova conta a pagar ou receber' });

    await user.type(within(dialog).getByLabelText('Valor'), '34210');
    await user.type(within(dialog).getByLabelText('Descrição'), 'IPTU, parcela 3');
    await user.click(within(dialog).getByRole('button', { name: 'Em 7 dias' }));
    expect(within(dialog).getByText(/Entra no "A pagar" do Livre até/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Salvar conta' }));

    expect(await screen.findByText('Conta "IPTU, parcela 3" criada.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).not.toContain('new=');
  });

  it('turns a receivable bill without due date into the "fora do Livre" hint', async () => {
    const user = userEvent.setup();
    renderApp(`${URL}&new=bill`);
    const dialog = await screen.findByRole('dialog', { name: 'Nova conta a pagar ou receber' });
    await within(dialog).findByRole('button', { name: 'Outras…' });

    await user.click(within(dialog).getByRole('radio', { name: 'A receber' }));

    expect(within(dialog).getByRole('radio', { name: 'A receber' })).toBeChecked();
    expect(within(dialog).getByText(/Sem vencimento: fica em "Sem data"/)).toBeInTheDocument();
  });

  it('turns "Todo mês" into a recurrence on the due day', async () => {
    const user = userEvent.setup();
    renderApp(`${URL}&new=bill`);
    const dialog = await screen.findByRole('dialog', { name: 'Nova conta a pagar ou receber' });

    await user.type(within(dialog).getByLabelText('Valor'), '12000');
    await user.type(within(dialog).getByLabelText('Descrição'), 'Condomínio');
    await user.click(within(dialog).getByRole('button', { name: 'Mais opções' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Todo mês' }));
    // a monthly bill needs the day: refused next to the date, nothing created
    await user.click(within(dialog).getByRole('button', { name: 'Salvar conta' }));
    expect(
      await within(dialog).findByText('Para repetir todo mês, escolha o dia do vencimento'),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Amanhã' }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar conta' }));

    expect(await screen.findByText('Recorrência "Condomínio" criada.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('edits a bill with the same modal', async () => {
    const user = userEvent.setup();
    renderApp(URL);
    const id = await waitFor(() => billIdOf('IPVA, cota 2'));
    window.history.replaceState({}, '', `${URL}&edit=${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    const dialog = await screen.findByRole('dialog', { name: 'Editar conta' });

    expect(within(dialog).getByLabelText('Descrição')).toHaveValue('IPVA, cota 2');
    expect(within(dialog).getByRole('radio', { name: 'A pagar' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText('Descrição'));
    await user.type(within(dialog).getByLabelText('Descrição'), 'IPVA, cota 3');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Conta "IPVA, cota 3" salva.')).toBeInTheDocument();
  });
});

describe('friend debt modal (the form pattern)', () => {
  it('offers the recent people as chips and saves "Me devem" with half of the paid transaction', async () => {
    const user = userEvent.setup();
    renderApp(`${URL}&new=debt`);
    const dialog = await screen.findByRole('dialog', { name: 'Dívida com amigo' });
    expect(within(dialog).getByText('Quem você deve')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: 'Me devem' }));
    expect(within(dialog).getByText('Quem te deve')).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: 'Júlia' })).toBeInTheDocument();

    // the paid transaction: a row to pick; the share of the friend is prefilled with half
    const [origin] = await within(dialog).findAllByRole('button', { name: /R\$/ });
    if (!origin) throw new Error('No transaction row');
    await user.click(origin);
    expect(origin).toHaveAttribute('aria-pressed', 'true');
    expect(within(dialog).getByText(/Já vem a metade/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Valor que é do amigo')).not.toHaveValue('');

    await user.click(within(dialog).getByRole('button', { name: 'Nova pessoa' }));
    await user.type(within(dialog).getByLabelText('Nome'), 'Bruno');
    await user.type(within(dialog).getByLabelText('O que foi'), 'Metade do Uber');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar dívida' }));

    expect(await screen.findByText('Dívida "Metade do Uber" criada.')).toBeInTheDocument();
  });

  it('explains the Pix (Q11) and offers the category of what was paid (Q18) in "Eu devo"', async () => {
    renderApp(`${URL}&new=debt`);
    const dialog = await screen.findByRole('dialog', { name: 'Dívida com amigo' });

    expect(within(dialog).getByText(/conta como gasto/)).toBeInTheDocument();
    expect(
      await within(dialog).findByRole('group', { name: 'Categoria do que foi pago' }),
    ).toBeInTheDocument();
  });

  it('refuses a debt without amount and description, next to the fields', async () => {
    const user = userEvent.setup();
    renderApp(`${URL}&new=debt`);
    const dialog = await screen.findByRole('dialog', { name: 'Dívida com amigo' });

    await user.click(within(dialog).getByRole('button', { name: 'Salvar dívida' }));

    expect(await within(dialog).findByText('Informe um valor maior que zero')).toBeInTheDocument();
    expect(within(dialog).getByText('Diga o que foi')).toBeInTheDocument();
  });
});

describe('bill row', () => {
  it('opens the edit modal, filled, when the name of a one-off bill is tapped', async () => {
    const user = userEvent.setup();
    renderApp(URL);
    const name = await waitFor(() => {
      const found = screen
        .getAllByText('IPVA, cota 2')
        .find((element) => element.closest('li')?.querySelector('button'));
      if (!found) throw new Error('No row');
      return found;
    });

    await user.click(name);

    const dialog = await screen.findByRole('dialog', { name: 'Editar conta' });
    expect(within(dialog).getByLabelText('Descrição')).toHaveValue('IPVA, cota 2');
    expect(window.location.search).toContain('edit=');
  });

  it('edits a one-off bill from the keyboard: the name is a button and Enter opens it', async () => {
    const user = userEvent.setup();
    renderApp(URL);

    const edit = await screen.findByRole(
      'button',
      { name: 'Editar IPVA, cota 2' },
      { timeout: 4000 },
    );
    edit.focus();
    expect(edit).toHaveFocus();
    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', { name: 'Editar conta' });
    expect(within(dialog).getByLabelText('Descrição')).toHaveValue('IPVA, cota 2');
  });

  it('does not edit a friend debt by tapping its name', async () => {
    const user = userEvent.setup();
    renderApp(URL);
    const name = await waitFor(() => {
      const found = screen
        .getAllByText('Você deve a Rafa')
        .find((element) => element.closest('li')?.querySelector('button'));
      if (!found) throw new Error('No row');
      return found;
    });

    await user.click(name);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
