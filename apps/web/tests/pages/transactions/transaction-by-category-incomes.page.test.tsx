import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

const PAGE = `/transactions?month=${CURRENT_MONTH}&view=category`;
const LONG_WAIT = { timeout: 5000 };

type Item = { id: string; name?: string };

async function idOf(path: string, name: string): Promise<string> {
  const { json } = await callApi('GET', path);
  const item = (json as { items: Item[] }).items.find((entry) => entry.name === name);
  if (!item) throw new Error(`Seed has no ${name}`);

  return item.id;
}

async function receive(description: string, cents: number, categoryId: string | null) {
  const accountId = await idOf('/accounts', 'Nubank');
  await callApi('POST', '/transactions', {
    type: 'income',
    accountId,
    method: 'pix',
    description,
    amountCents: cents,
    occurredOn: `${CURRENT_MONTH}-20`,
    ...(categoryId ? { categoryId } : {}),
  });
}

describe('"Por categoria": the income sources work like the expense groups', () => {
  beforeEach(async () => {
    const salary = await idOf('/categories', 'Salário');
    const freelance = await idOf('/categories', 'Freelance');
    await receive('PIX SALARIO TESTE', 300_000, salary);
    await receive('PIX SALARIO EXTRA', 80_000, salary);
    await receive('PIX FREELA TESTE', 45_000, freelance);
  });

  it('opens a source to its last transactions, with "Ver as N transações na lista"', async () => {
    renderApp(PAGE);

    const group = await screen.findByRole('button', { name: 'Salário' }, LONG_WAIT);
    expect(group).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(group);

    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('PIX SALARIO TESTE')).toBeInTheDocument();
    expect(screen.getByText('PIX SALARIO EXTRA')).toBeInTheDocument();
    // The seed has two TED of Salário too: four in all, the last three on the list.
    expect(screen.getAllByText('TED ALVORADA SISTEMAS')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ver as 4 transações na lista' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Ver as 4 transações na lista' }));
    await waitFor(() => expect(window.location.search).toContain('category='));
    expect(window.location.search).not.toContain('view=category');
  });

  it('keeps one group open at a time, across the expenses and the incomes', async () => {
    renderApp(PAGE);
    const salary = await screen.findByRole('button', { name: 'Salário' }, LONG_WAIT);
    const freelance = await screen.findByRole('button', { name: 'Freelance' });
    const market = await screen.findByRole('button', { name: 'Mercado' });

    fireEvent.click(salary);
    expect(salary).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(freelance);
    expect(freelance).toHaveAttribute('aria-expanded', 'true');
    expect(salary).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(market);
    expect(market).toHaveAttribute('aria-expanded', 'true');
    expect(freelance).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(salary);
    expect(salary).toHaveAttribute('aria-expanded', 'true');
    expect(market).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes an open source when it is pressed again', async () => {
    renderApp(PAGE);
    const salary = await screen.findByRole('button', { name: 'Salário' }, LONG_WAIT);

    fireEvent.click(salary);
    expect(salary).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(salary);
    expect(salary).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a source over a wider period too', async () => {
    renderApp(`${PAGE}&period=12m`);
    const freelance = await screen.findByRole('button', { name: 'Freelance' }, LONG_WAIT);

    fireEvent.click(freelance);

    expect(await screen.findByText('PIX FREELA TESTE')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ver as? \d* ?transaç(ão|ões) na lista/ }),
    ).toBeVisible();
  });

  it('puts the income with no category to review, like the expense with none', async () => {
    await receive('PIX SEM CATEGORIA', 5000, null);
    renderApp(PAGE);

    const name = await screen.findByText('Outras receitas', undefined, LONG_WAIT);
    // The row of the group: the first ancestor of its name that holds a "Revisar" button.
    let group = name.parentElement;
    while (group && !within(group).queryByRole('button', { name: 'Revisar' })) {
      group = group.parentElement;
    }
    expect(group).not.toBeNull();
    expect(within(group!).queryByRole('button', { name: 'Outras receitas' })).toBeNull();

    fireEvent.click(within(group!).getByRole('button', { name: 'Revisar' }));
    await waitFor(() => expect(window.location.pathname).toBe('/transactions/review'));
  });
});
