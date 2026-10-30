import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function invoicePayments() {
  return db.invoices.flatMap((invoice) => invoice.payments);
}

/** The invoice behind the n-th "Ver fatura": cards are listed by name, Bradesco Black then Roxinho. */
async function openInvoice(index: number) {
  renderApp('/accounts');
  await screen.findByRole('heading', { name: 'Cartões de crédito' });
  fireEvent.click((await screen.findAllByRole('button', { name: 'Ver fatura' }))[index]!);
  return screen.findByRole('dialog', { name: /Fatura de/ });
}

describe('Ver fatura (?invoice=)', () => {
  it('keeps the invoice in the URL and lists what it is made of', async () => {
    const dialog = await openInvoice(1);

    expect(window.location.search).toMatch(/invoice=[^&]+%3A\d{4}-\d{2}|invoice=[^&]+:\d{4}-\d{2}/);
    expect(await within(dialog).findByText('Lançamentos')).toBeInTheDocument();
    expect(within(dialog).getByText('Pagamentos')).toBeInTheDocument();
  });

  it('registers a payment of the invoice', async () => {
    const dialog = await openInvoice(1);

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Registrar pagamento' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Valor pago' }), {
      target: { value: '10000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar pagamento' }));

    await waitFor(() => expect(invoicePayments().length).toBeGreaterThan(0));
    expect(await within(dialog).findByText(/Pago em/)).toBeInTheDocument();
  });

  it('links the payment the app found and offers Desfazer', async () => {
    renderApp('/accounts');
    await screen.findByRole('heading', { name: 'Cartões de crédito' });
    const buttons = await screen.findAllByRole('button', { name: 'Ver fatura' });

    let dialog: HTMLElement | null = null;
    for (const button of buttons) {
      fireEvent.click(button);
      const candidate = await screen.findByRole('dialog', { name: /Fatura de/ });
      await within(candidate).findByText('Lançamentos');
      if (within(candidate).queryByText('Pagamento encontrado')) {
        dialog = candidate;
        break;
      }
      fireEvent.click(within(candidate).getByRole('button', { name: 'Fechar' }));
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: /Fatura de/ })).not.toBeInTheDocument(),
      );
    }
    if (!dialog) throw new Error('The seed has no invoice with a payment suggestion');

    const before = invoicePayments().length;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vincular' }));

    expect(await screen.findByText(/Pagamento vinculado à fatura/)).toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).queryByText('Pagamento encontrado')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Desfazer'));
    await waitFor(() => expect(invoicePayments()).toHaveLength(before));
  });

  it('shows the error state with a way to try again when the invoice does not load', async () => {
    renderApp('/accounts?invoice=00000000-0000-7000-8000-000000000000:2026-10');

    expect(await screen.findByText('Não deu para carregar a fatura')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
