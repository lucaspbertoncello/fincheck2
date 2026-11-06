import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

function card(name: string) {
  const account = db.accounts.find((item) => item.name === name);
  if (!account?.creditCard) throw new Error(`The seed has no card ${name}`);

  return { id: account.id, openMonth: openMonthFor(account.creditCard, TODAY) };
}

/** Opens the invoice page of a card in a month (the open one by default). */
async function openInvoice(name: string, shift = 0, search = '?from=accounts') {
  const { id, openMonth } = card(name);
  const month = addMonths(openMonth, shift);
  renderApp(`/cards/${id}/invoices/${month}${search}`);
  expect(await screen.findByRole('heading', { level: 1, name: /Fatura de/ })).toBeInTheDocument();
  await screen.findByRole('heading', { name: 'Lançamentos' });

  return { id, month };
}

/** One entry per line of the invoice (each one is a `li` that wraps the row). */
/** "Fatura de novembro 2026": the title of the invoice of a month. */
function titleOf(month: string) {
  const { monthLabel, yearLabel } = formatMonthParts(month);

  return `Fatura de ${monthLabel.toLowerCase()} ${yearLabel}`;
}

function lines() {
  const region = screen.getByRole('region', { name: 'Lançamentos' });

  return Array.from(region.querySelectorAll<HTMLElement>('li[class~="group/row"]'));
}

describe('Fatura, página (BR-INV-006)', () => {
  it('shows the open invoice: the top, where the money went, the highlights and the lines', async () => {
    const { month } = await openInvoice('Roxinho');

    const summary = screen.getByRole('region', { name: 'Resumo da fatura' });
    expect(within(summary).getByText('Fatura aberta')).toBeInTheDocument();
    expect(within(summary).getByText(/^vence em \d+ dias$/i)).toBeInTheDocument();
    expect(
      within(summary).getByRole('progressbar', { name: 'Ciclo da fatura' }),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText(
        `que ${formatMonthParts(addMonths(month, -1)).monthLabel.toLowerCase()}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Para onde foi' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Destaques' })).toBeInTheDocument();
    expect(
      screen.getByText(`${formatMonthParts(addMonths(month, 1)).monthLabel} já começa com`),
    ).toBeInTheDocument();
    const highlights = screen.getByRole('heading', { name: 'Destaques' }).closest('section')!;
    expect(within(highlights).getByText('Geladeira Frost Free')).toBeInTheDocument();
    expect(within(highlights).getByText('Maior compra desta fatura')).toBeInTheDocument();
    expect(screen.getAllByTitle('Parcela 10 de 10').length).toBeGreaterThan(0);
  });

  it('leads back to where the person came from', async () => {
    await openInvoice('Roxinho');
    expect(screen.getByRole('link', { name: 'Voltar para Contas e cartões' })).toHaveAttribute(
      'href',
      '/accounts',
    );
  });

  it('leads back to A pagar e receber when it came from there', async () => {
    await openInvoice('Roxinho', 0, '?from=bills');
    expect(screen.getByRole('link', { name: 'Voltar para A pagar e receber' })).toHaveAttribute(
      'href',
      '/recurrences/bills',
    );
  });

  it('goes to the invoice before and after with the arrows, and stops at the limits', async () => {
    const { id, month } = await openInvoice('Roxinho');

    fireEvent.click(screen.getByRole('button', { name: 'Fatura anterior' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: titleOf(addMonths(month, -1)) }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/cards/${id}/invoices/${addMonths(month, -1)}`);
    expect(window.location.search).toContain('from=accounts');
    expect(await screen.findByText('Fatura paga')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fatura seguinte' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: titleOf(month) }),
    ).toBeInTheDocument();
  });

  it('has no arrow past the last invoice the card lists, nor before the first one', async () => {
    await openInvoice('Roxinho', 3);
    expect(screen.getByRole('button', { name: 'Fatura seguinte' })).toBeDisabled();
    expect(await screen.findByText('Fatura projetada')).toBeInTheDocument();
  });

  it('filters the lines by a category, says so, and clears on the second tap', async () => {
    await openInvoice('Roxinho');
    const all = lines().length;
    expect(all).toBeGreaterThanOrEqual(30);

    const composition = screen.getByRole('heading', { name: 'Para onde foi' }).closest('section')!;
    const first = within(composition).getAllByRole('button', { pressed: false })[0]!;
    fireEvent.click(first);

    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(/^Só /)).toBeInTheDocument();
    expect(lines().length).toBeLessThan(all);
    expect(screen.getAllByRole('button', { name: 'Limpar filtro' }).length).toBeGreaterThan(0);

    fireEvent.click(first);
    await waitFor(() => expect(lines()).toHaveLength(all));
    expect(first).toHaveAttribute('aria-pressed', 'false');
  });

  it('searches the lines, and says so when nothing matches', async () => {
    const user = userEvent.setup();
    await openInvoice('Roxinho');
    const all = lines().length;

    await user.type(screen.getByRole('searchbox', { name: 'Buscar lançamento' }), 'ifood');
    await waitFor(() => expect(lines().length).toBeLessThan(all));
    expect(lines().length).toBeGreaterThan(0);

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar lançamento' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar lançamento' }), 'zzzz');
    expect(await screen.findByText('Nenhum lançamento com esses filtros.')).toBeInTheDocument();
  });

  it('orders by value: one block, the biggest charge first', async () => {
    const user = userEvent.setup();
    await openInvoice('Roxinho');

    await user.click(screen.getByRole('radio', { name: 'Por valor' }));

    expect(
      await screen.findByRole('heading', { name: 'Do maior para o menor' }),
    ).toBeInTheDocument();
    const [firstLine] = lines();
    expect(firstLine).toHaveTextContent('Notebook Aero 14');
  });

  it('shows a refund as a refund, in green with a plus', async () => {
    await openInvoice('Roxinho');
    const refund = screen.getByText('ESTORNO LOJA ONLINE VAREJAO').closest('li')!;
    expect(within(refund).getByText('Estorno')).toBeInTheDocument();
    expect(refund).toHaveTextContent('+');
  });

  it('registers a payment with the date shortcuts and the rest already in the amount', async () => {
    const user = userEvent.setup();
    await openInvoice('Roxinho');

    await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(screen.getByRole('textbox', { name: 'Valor pago' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoje', pressed: true })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ontem' }));
    await user.click(screen.getByRole('button', { name: 'Salvar pagamento' }));

    await waitFor(() =>
      expect(db.invoices.flatMap((invoice) => invoice.payments).length).toBeGreaterThan(0),
    );
    expect(await screen.findByText(/Pago em/)).toBeInTheDocument();
  });

  it('links the payment the app found and offers Desfazer', async () => {
    await openInvoice('Bradesco Black', -1);
    expect(screen.getByText('Fatura fechada')).toBeInTheDocument();
    const before = db.invoices.flatMap((invoice) => invoice.payments).length;

    fireEvent.click(await screen.findByRole('button', { name: 'Vincular' }));

    expect(await screen.findByText(/Pagamento vinculado à fatura/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Pagamento encontrado')).not.toBeInTheDocument());

    fireEvent.click(screen.getByText('Desfazer'));
    await waitFor(() =>
      expect(db.invoices.flatMap((invoice) => invoice.payments)).toHaveLength(before),
    );
  });

  it('opens "Corrigir valor" over the page', async () => {
    const user = userEvent.setup();
    await openInvoice('Roxinho');

    await user.click(screen.getByRole('button', { name: 'Corrigir valor' }));

    expect(
      await screen.findByRole('dialog', { name: 'Corrigir valor da fatura' }),
    ).toBeInTheDocument();
  });

  it('shows a paid invoice with no payment button and when it was paid', async () => {
    await openInvoice('Roxinho', -1);

    expect(await screen.findByText('Fatura paga')).toBeInTheDocument();
    expect(screen.getByText(/^paga em \d{2}\/\d{2}$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Ciclo da fatura' })).not.toBeInTheDocument();
  });

  it('says there are no lines on an invoice with none, and draws no composition', async () => {
    const { id } = card('Roxinho');
    renderApp(`/cards/${id}/invoices/2026-04?from=accounts`);

    expect(await screen.findByText('Nenhum lançamento nesta fatura')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Para onde foi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Destaques' })).not.toBeInTheDocument();
    // No invoice before it either: the arrow waits.
    expect(screen.getByRole('button', { name: 'Fatura anterior' })).toBeDisabled();
  });

  it('shows the error state with a way to try again when the invoice does not load', async () => {
    renderApp('/cards/00000000-0000-7000-8000-000000000000/invoices/2026-10');

    expect(await screen.findByText('Não deu para carregar a fatura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('says the invoice does not exist when the month in the address is not a month', async () => {
    const { id } = card('Roxinho');
    renderApp(`/cards/${id}/invoices/2026-13`);

    expect(await screen.findByText('Essa fatura não existe')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Voltar para Contas e cartões' }),
    ).toBeInTheDocument();
  });

  it('keeps Contas e cartões lit in the navigation', async () => {
    await openInvoice('Roxinho');
    const current = screen.getAllByRole('link', { current: 'page' });
    expect(current.some((link) => /Contas/.test(link.textContent ?? ''))).toBe(true);
  });
});

describe('Fatura, página: o cartão no topo', () => {
  it('draws the bank card on top, before the summary, with the name of the transition', async () => {
    const { id } = await openInvoice('Roxinho');

    const bankCard = screen.getByRole('img', { name: /Roxinho, final 4821/ });
    const summary = screen.getByRole('region', { name: 'Resumo da fatura' });
    expect(
      bankCard.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(bankCard.style.getPropertyValue('--card-vt-name')).toBe(`card-${id}`);
    expect(document.querySelectorAll('[data-shared-card]')).toHaveLength(1);
  });

  it('keeps one named card (the same one) when the arrows change the invoice', async () => {
    const { id, month } = await openInvoice('Roxinho');

    fireEvent.click(screen.getByRole('button', { name: 'Fatura anterior' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: titleOf(addMonths(month, -1)) }),
    ).toBeInTheDocument();

    const named = document.querySelectorAll<HTMLElement>('[data-shared-card]');
    expect(named).toHaveLength(1);
    expect(named[0]!.style.getPropertyValue('--card-vt-name')).toBe(`card-${id}`);
  });
});
