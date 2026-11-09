import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

let media: ReturnType<typeof stubMatchMedia> | undefined;
afterEach(() => media?.restore());

const ADD_CARD = { name: 'Adicionar cartão de crédito' };
const ADD_ACCOUNT = { name: 'Adicionar conta' };

/** The seed has two active cards; this leaves exactly `count` (archiving the extra ones or adding). */
function setActiveCards(count: number) {
  const cards = db.accounts.filter((item) => item.type === 'credit_card');
  const [template] = cards;
  if (!template) throw new Error('The seed has no card');
  cards.forEach((card, index) => {
    card.archivedAt = index < count ? null : '2026-11-01T10:00:00.000Z';
  });
  for (let index = cards.length; index < count; index += 1) {
    db.accounts.push({
      ...template,
      id: `0190a000-0000-7000-8000-0000000000c${index}`,
      name: `Cartão extra ${index}`,
      source: 'manual',
      connectionId: null,
      creditCard: template.creditCard && { ...template.creditCard, last4: `90${index}0` },
      archivedAt: null,
    });
  }
}

async function openAccounts() {
  renderApp('/accounts');
  await screen.findByRole('heading', { level: 1, name: 'Contas e cartões' });
}

describe('Contas e cartões, the "Cartões de crédito" section', () => {
  it('has no section when there is no card', async () => {
    setActiveCards(0);
    await openAccounts();
    await screen.findByRole('region', { name: 'Contas' });

    expect(screen.queryByRole('heading', { name: 'Cartões de crédito' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', ADD_CARD)).not.toBeInTheDocument();
  });

  it('puts the dashed add box beside a single card, and it opens the card form', async () => {
    setActiveCards(1);
    await openAccounts();

    const add = await screen.findByRole('button', ADD_CARD);
    expect(add.className).toContain('border-dashed');
    expect(screen.queryByRole('button', { name: 'Próximos cartões' })).not.toBeInTheDocument();

    fireEvent.click(add);

    const dialog = await screen.findByRole('dialog', { name: 'Nova conta manual' });
    expect(window.location.search).toContain('new=card');
    // Already on the manual form, with the credit card kind chosen and its own fields.
    expect(within(dialog).getByRole('radio', { name: /Cartão de crédito/ })).toBeChecked();
    expect(within(dialog).getByRole('textbox', { name: 'Dia de fechamento' })).toBeInTheDocument();
  });

  it('shows two cards with no box and no arrows on the desktop', async () => {
    media = stubMatchMedia({ desktop: true });
    setActiveCards(2);
    await openAccounts();
    await screen.findByRole('img', { name: /Roxinho, final 4821/ });

    expect(screen.getByRole('img', { name: /Bradesco Black, final 7733/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', ADD_CARD)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cartões anteriores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximos cartões' })).not.toBeInTheDocument();
  });

  it('on the phone two cards are two pages: the arrows are on the title line', async () => {
    // jsdom without matchMedia is the phone layout.
    setActiveCards(2);
    await openAccounts();

    const section = await screen.findByRole('region', { name: 'Cartões de crédito' });
    expect(within(section).getByRole('button', { name: 'Cartões anteriores' })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Próximos cartões' })).toBeInTheDocument();
    expect(within(section).getAllByRole('img', { name: /final/ })).toHaveLength(2);
  });

  it.each([3, 5])('pages %i cards by the arrows on the title line', async (count) => {
    setActiveCards(count);
    await openAccounts();

    const section = await screen.findByRole('region', { name: 'Cartões de crédito' });
    const track = await within(section).findByRole('group', { name: 'Cartões de crédito' });
    expect(within(track).getAllByRole('img', { name: /final/ })).toHaveLength(count);
    expect(within(section).getByRole('button', { name: 'Cartões anteriores' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(section).queryByRole('button', ADD_CARD)).not.toBeInTheDocument();
  });
});

describe('Contas e cartões, the "Contas" section', () => {
  it('fills the odd place of the two columns with the dashed "Adicionar conta" box', async () => {
    // The seed has three active accounts (Nubank, Bradesco, Carteira).
    await openAccounts();

    const add = await screen.findByRole('button', ADD_ACCOUNT);
    expect(add.className).toContain('border-dashed');

    fireEvent.click(add);
    expect(await screen.findByRole('dialog', { name: 'Conectar banco' })).toBeInTheDocument();
  });

  it('has no add box when the accounts fill the rows', async () => {
    const wallet = db.accounts.find((item) => item.name === 'Carteira');
    if (!wallet) throw new Error('The seed has no Carteira');
    db.accounts.push({ ...wallet, id: '0190a000-0000-7000-8000-0000000000d1', name: 'Cofrinho' });
    await openAccounts();
    await screen.findByRole('article', { name: 'Cofrinho' });

    expect(screen.queryByRole('button', ADD_ACCOUNT)).not.toBeInTheDocument();
  });
});
