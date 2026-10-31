import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/clock.constant.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const URL = `/recurrences/bills?month=${CURRENT_MONTH}`;

// The row of the agenda (the "A pagar" card repeats the names in its hidden composition).
function rowOf(name: string): HTMLElement {
  const row = screen
    .getAllByText(name)
    .map((element) => element.closest('li'))
    .find((item) => item?.querySelector('button'));
  if (!row) throw new Error(`No row for ${name}`);
  return row;
}

// The first wait of every test is the whole screen: the shell, the agenda query (the mock composes
// bills, invoices, debts and recurrences) and the free-balance panel. With the full suite running
// in parallel that takes longer than the 1 s default of waitFor, which made the test flaky. Waiting
// is not a sleep: it returns as soon as the row is there.
const SCREEN_LOAD_TIMEOUT = 4000;

function findRow(name: string): Promise<HTMLElement> {
  return waitFor(() => rowOf(name), { timeout: SCREEN_LOAD_TIMEOUT });
}

describe('BillListPage', () => {
  it('shows the two cards, the sections and the rows of the agenda', async () => {
    renderApp(URL);

    await findRow('Você deve a Rafa');
    // The "A pagar" card is a button; the free-balance panel repeats the words inside the main.
    expect(screen.getByRole('button', { name: /A pagar/ })).toBeInTheDocument();
    expect(screen.getByText('A receber de amigos')).toBeInTheDocument();
    expect(screen.getByText(/não conta como receita/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Este mês' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faturas abertas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A receber' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Quitadas em / })).toBeInTheDocument();
    expect(within(rowOf('Você deve a Rafa')).getByText('Dívida')).toBeInTheDocument();
    expect(within(rowOf('Júlia te deve')).getByText('Você pagou')).toBeInTheDocument();
    // A friend debt with a Pix already linked shows the partial bar
    expect(within(rowOf('Você deve a Rafa')).getByText(/falta/)).toBeInTheDocument();
  });

  it('opens the composition of the "A pagar" card', async () => {
    renderApp(URL);
    await findRow('Você deve a Rafa');

    fireEvent.click(screen.getByRole('button', { name: /A pagar/ }));

    expect(screen.getByRole('button', { name: /A pagar/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows "pago, falta vincular" on a bill whose payment was detected, and "Vincular" only confirms', async () => {
    renderApp(URL);
    await findRow('Você deve a Rafa');
    const row = rowOf('Mensalidade do curso');
    expect(within(row).getByText('Pago, falta vincular')).toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Vincular' }));

    // linked: an undo toast appears and the row is settled, so the "paid, not linked" label is gone
    expect(
      await screen.findByText('Mensalidade do curso: pagamento vinculado.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      const rows = screen.getAllByText('Mensalidade do curso').map((el) => el.closest('li'));
      expect(rows.some((row) => row?.textContent?.includes('Pago, falta vincular'))).toBe(false);
    });
  });

  it('registers a partial payment of a bill, with the toast, and the row follows', async () => {
    renderApp(URL);
    await findRow('IPVA, cota 2');

    fireEvent.click(
      within(rowOf('IPVA, cota 2')).getByRole('button', { name: 'Registrar pagamento' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Registrar pagamento' });
    // one wrong try first: zero is refused next to the field
    fireEvent.change(within(dialog).getByLabelText('Quanto você pagou'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar pagamento' }));
    expect(await within(dialog).findByText('Informe um valor maior que zero')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Quanto você pagou'), {
      target: { value: '10000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar pagamento' }));

    expect(await screen.findByText('Pagamento de IPVA, cota 2 registrado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await within(rowOf('IPVA, cota 2')).findByText(/falta/)).toBeInTheDocument();
    expect(window.location.search).not.toContain('pay=');
  });

  it('opens "Vincular o pagamento?" for an invoice with a payment found and links it', async () => {
    renderApp(URL);
    await findRow('Você deve a Rafa');
    const found = await screen.findByText(/Pagamento encontrado/);
    const row = found.closest('li');
    if (!row) throw new Error('No invoice row');

    fireEvent.click(within(row).getByRole('button'));
    const dialog = await screen.findByRole('dialog', { name: 'Vincular o pagamento?' });
    // the bank text of the transaction found is shown, not only its amount
    expect(within(dialog).getByText(/PAGAMENTO FATURA/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vincular' }));

    expect(await screen.findByText(/pagamento vinculado\./)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens the new-bill modal from ?new=bill, validates and creates the bill', async () => {
    renderApp(`${URL}&new=bill`);
    const dialog = await screen.findByRole('dialog', { name: 'Nova conta a pagar ou receber' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar conta' }));
    expect(await within(dialog).findByText('Informe um valor maior que zero')).toBeInTheDocument();
    expect(within(dialog).getByText('Diga o que é a conta')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Valor'), { target: { value: '34210' } });
    fireEvent.change(within(dialog).getByLabelText('Descrição'), {
      target: { value: 'IPTU, parcela 3' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar conta' }));

    expect(await screen.findByText('Conta "IPTU, parcela 3" criada.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.search).not.toContain('new=');
    expect(await findRow('IPTU, parcela 3')).toHaveTextContent('Sem data');
  });

  it('shows the empty state when there is nothing to pay or receive', async () => {
    server.use(
      http.get('/api/agenda', () =>
        HttpResponse.json({
          month: CURRENT_MONTH,
          payable: { totalCents: 0, count: 0, items: [] },
          friendsReceivable: { totalCents: 0, peopleCount: 0 },
          thisMonth: [],
          openInvoices: [],
          receivable: [],
          undated: [],
          settled: [],
        }),
      ),
    );
    renderApp(URL);

    expect(await screen.findByRole('heading', { name: /^Nada a pagar até / })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lançar dívida com amigo' }));
    expect(await screen.findByRole('dialog', { name: 'Dívida com amigo' })).toBeInTheDocument();
  });

  it('shows the error with "Tentar de novo", and recovers', async () => {
    server.use(
      http.get(
        '/api/agenda',
        () => HttpResponse.json({ code: 'BOOM', message: 'x' }, { status: 500 }),
        {
          once: true,
        },
      ),
    );
    renderApp(URL);

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));

    await findRow('Você deve a Rafa');
  });
});
