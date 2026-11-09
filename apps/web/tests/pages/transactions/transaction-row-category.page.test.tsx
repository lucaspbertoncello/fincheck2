import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

const PAGE = `/transactions?month=${CURRENT_MONTH}`;
const LONG_WAIT = { timeout: 5000 };

/** The row of a transaction: the standard list row that holds its name. */
async function rowOf(description: string): Promise<HTMLElement> {
  const name = await screen.findByText(description, undefined, LONG_WAIT);
  const row = name.closest('li');
  if (!row) throw new Error(`No row for ${description}`);

  return row;
}

describe('the category on the row of a transaction', () => {
  it('shows the category and, next to it, the tags of the transaction', async () => {
    renderApp(PAGE);

    const row = await rowOf('IFOOD *RESTAURANTE');
    await within(row).findByText('delivery');
    const detail = within(row).getByText('Delivery').closest('p');

    // One detail line: the category, then the tag in its chip, then the account.
    expect(detail?.getAttribute('title')).toMatch(/^Delivery · #delivery · .+, crédito$/);
    expect(detail?.textContent).toMatch(/^Delivery\s*delivery\s*·\s*.+, crédito$/);
  });

  it('shows the category of each part of a split transaction', async () => {
    renderApp(PAGE);

    const row = await rowOf('RESTAURANTE CANTINA NONNA');

    // "Minha parte" is in Restaurantes; the other half is a debt with a friend.
    expect(within(row).getByText('Restaurantes')).toBeInTheDocument();
    expect(within(row).getByText('Dívida com amigo')).toBeInTheDocument();
    expect(within(row).getByText('Dividida em 2')).toBeInTheDocument();
  });

  it('says "Sem categoria" on a transaction with no category', async () => {
    renderApp(PAGE);

    const row = await rowOf('PIX LANCHONETE ZE');

    expect(within(row).getByText('Sem categoria')).toBeInTheDocument();
  });

  it('names the category that is a transfer on both legs it made', async () => {
    renderApp(PAGE);

    const out = await rowOf('ROTACAO CAIXA DO MES PARA BRADESCO');
    const incoming = await rowOf('ROTACAO CAIXA DO MES DO NUBANK');

    expect(within(out).getByText('Rotação entre contas')).toBeInTheDocument();
    expect(within(incoming).getByText('Rotação entre contas')).toBeInTheDocument();
  });
});
