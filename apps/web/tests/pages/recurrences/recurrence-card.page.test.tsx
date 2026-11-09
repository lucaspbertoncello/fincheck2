import { cleanup, configure, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { makeOccurrenceLate } from '#tests/support/recurrences/occurrence/make-occurrence-late.util.ts';

resetDatabaseBeforeEach();

// Rendering the whole app can take longer than the default waits when the other workers are busy.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

const URL = `/recurrences?month=${CURRENT_MONTH}`;
const INCOME_URL = `${URL}&flow=income`;

// The money is written in pieces ("R$" and the digits): compare the text without spaces.
const plain = (element: Element) => (element.textContent ?? '').replace(/\s/g, '');

function cardOf(region: HTMLElement, name: string): HTMLElement {
  const card = within(region)
    .getByRole('button', { name: `Transações de ${name}` })
    .closest('li');
  if (!card) throw new Error(`No card for ${name}`);

  return card;
}

const triggerOf = (card: HTMLElement, name: string) =>
  within(card).getByRole('button', { name: `Transações de ${name}` });

const findExpenses = () => screen.findByRole('region', { name: 'Despesas fixas' });
const findIncomes = () => screen.findByRole('region', { name: 'Receitas' });
const findAttention = () => screen.findByRole('region', { name: 'Precisa de você' });

function paymentOf(recurrenceName: string) {
  const recurrence = db.recurrences.find((item) => item.name === recurrenceName);
  const occurrence = db.occurrences.find(
    (item) => item.recurrenceId === recurrence?.id && item.month === CURRENT_MONTH,
  );
  const payment = occurrence?.payments[0];
  const transaction = db.transactions.find((item) => item.id === payment?.transactionId);
  if (!payment || !transaction) throw new Error(`No payment of ${recurrenceName}`);

  return { payment, transaction };
}

describe('the card of a recurrence', () => {
  it('shows what should come in on every card and what is missing on the partial one', async () => {
    renderApp(INCOME_URL);
    const incomes = await findIncomes();

    // Mesada: R$ 400 of R$ 800, in two payments at most.
    const mesada = cardOf(incomes, 'Mesada');
    expect(plain(mesada)).toContain('≈R$800,00previstos');
    expect(plain(mesada)).toContain('faltam≈R$400,00');
    expect(within(mesada).getByRole('progressbar')).toBeInTheDocument();
    // The main value is what came in, written before the references.
    expect(plain(mesada).indexOf('400,00')).toBeLessThan(plain(mesada).indexOf('previstos'));

    // A confirmed one keeps the expected amount and has nothing missing.
    const vr = cardOf(incomes, 'VR convertido');
    expect(plain(vr)).toContain('previstos');
    expect(plain(vr)).not.toContain('faltam');
  });

  it('shows the expected amount of a paid expense and calls an unpaid one a forecast', async () => {
    renderApp(URL);
    const expenses = await findExpenses();

    const academia = cardOf(expenses, 'Academia');
    expect(plain(academia)).toContain('≈R$109,90previstos');
    expect(plain(academia)).not.toContain('faltam');

    const celular = cardOf(expenses, 'Plano celular');
    expect(plain(celular)).toContain('previsto');
    expect(plain(celular)).not.toContain('previstos');
  });

  it('shows what came in above the expected amount, never hiding the excess', async () => {
    // R$ 900 came in for the R$ 800 that were expected.
    const { payment, transaction } = paymentOf('Mesada');
    payment.amountCents = 90_000;
    transaction.amountCents = 90_000;

    renderApp(INCOME_URL);
    const mesada = cardOf(await findAttention(), 'Mesada');

    expect(plain(mesada)).toContain('≈R$800,00previstos');
    expect(plain(mesada)).toContain('R$100,00amais');
    expect(plain(mesada)).not.toContain('faltam');
  });

  it('shows the expected amount of a card marked as done by hand, with no payment', async () => {
    const recurrence = db.recurrences.find((item) => item.name === 'Plano celular');
    const record = db.occurrences.find(
      (item) => item.recurrenceId === recurrence?.id && item.month === CURRENT_MONTH,
    );
    if (!record) throw new Error('No occurrence of Plano celular');
    record.settledAt = `${CURRENT_MONTH}-01T12:00:00.000Z`;

    renderApp(URL);
    const celular = cardOf(await findExpenses(), 'Plano celular');

    expect(plain(celular)).toContain('≈R$54,99previstos');
  });

  describe('the detail line', () => {
    const FULL = /^1 recebimento, o último em \d\d\/\d\d · Em qualquer dia do mês, .*Pix do Jorge$/;

    it('shows the whole text below the desktop, wrapping, with nothing clipped', async () => {
      renderApp(INCOME_URL);
      const mesada = cardOf(await findIncomes(), 'Mesada');

      const detail = within(mesada).getByText(FULL);
      expect(detail.tagName).toBe('P');
      expect(detail).not.toHaveClass('truncate');
      expect(detail.closest('[title]')).toBeNull();
      // It is not the clamped line of the row: it sits on the strip under the text.
      expect(detail).toHaveClass('basis-full');
    });

    it('is one line with an ellipsis from the desktop, the whole text in the title', async () => {
      const media = stubMatchMedia({ desktop: true });
      try {
        renderApp(INCOME_URL);
        const mesada = cardOf(await findIncomes(), 'Mesada');

        const detail = within(mesada).getByText(FULL);
        expect(detail).toHaveClass('truncate');
        expect(detail.parentElement).toHaveAttribute('title', detail.textContent ?? '');
        // The title is the full text the user cannot see when it is cut.
        expect(detail.parentElement?.getAttribute('title')).toContain('Pix do Jorge');
      } finally {
        media.restore();
      }
    });

    it('keeps the references on the strip below the desktop and under the amount from it', async () => {
      renderApp(INCOME_URL);
      const mobile = cardOf(await findIncomes(), 'Mesada');
      expect(
        within(mobile)
          .getByText(/previstos/)
          .closest('div'),
      ).toHaveClass('basis-full');
      expect(within(mobile).getByRole('progressbar').parentElement).toHaveClass('basis-full');
      cleanup();

      const media = stubMatchMedia({ desktop: true });
      try {
        renderApp(INCOME_URL);
        const desktop = cardOf(await findIncomes(), 'Mesada');
        expect(
          within(desktop)
            .getByText(/previstos/)
            .closest('div'),
        ).not.toHaveClass('basis-full');
        expect(within(desktop).getByRole('progressbar')).toBeInTheDocument();
      } finally {
        media.restore();
      }
    });
  });

  it('opens on a click with the transactions of the month and closes on the next one', async () => {
    renderApp(URL);
    const academia = cardOf(await findExpenses(), 'Academia');
    const trigger = triggerOf(academia, 'Academia');
    const { payment } = paymentOf('Academia');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(within(academia).queryByText('ACADEMIA FORMA FISICA')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const list = within(academia).getByRole('list', { name: 'Transações de Academia' });
    expect(within(list).getByText('ACADEMIA FORMA FISICA')).toBeInTheDocument();
    const { occurredOn } = payment;
    expect(
      within(list).getByText(`${occurredOn.slice(8, 10)}/${occurredOn.slice(5, 7)}`),
    ).toBeVisible();
    expect(plain(list)).toContain('109,90');
    expect(document.getElementById(trigger.getAttribute('aria-controls') ?? '')).toContainElement(
      list,
    );

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // It folds with the Collapse: the content stays until the fold ends, but nobody reaches it.
    expect(document.getElementById(trigger.getAttribute('aria-controls') ?? '')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('opens with Enter and Space, each card apart from the others', async () => {
    renderApp(URL);
    const expenses = await findExpenses();
    const academia = triggerOf(cardOf(expenses, 'Academia'), 'Academia');
    const celular = triggerOf(cardOf(expenses, 'Plano celular'), 'Plano celular');

    academia.focus();
    await userEvent.keyboard('{Enter}');
    celular.focus();
    await userEvent.keyboard(' ');

    expect(academia).toHaveAttribute('aria-expanded', 'true');
    expect(celular).toHaveAttribute('aria-expanded', 'true');

    academia.focus();
    await userEvent.keyboard('{Enter}');

    expect(academia).toHaveAttribute('aria-expanded', 'false');
    expect(celular).toHaveAttribute('aria-expanded', 'true');
  });

  it('says so when no transaction is linked', async () => {
    renderApp(URL);
    const expenses = await findExpenses();
    const celular = cardOf(expenses, 'Plano celular');
    expect(within(celular).queryByText('Nenhuma transação vinculada neste mês')).toBeNull();

    await userEvent.click(triggerOf(celular, 'Plano celular'));

    expect(within(celular).getByText('Nenhuma transação vinculada neste mês')).toBeInTheDocument();
  });

  it('opens the cards of "Precisa de você" too, keeping the decision on their strip', async () => {
    renderApp(URL);
    const attention = await findAttention();
    const diarista = cardOf(attention, 'Diarista');
    const internet = cardOf(attention, 'Internet');

    await userEvent.click(triggerOf(diarista, 'Diarista'));
    await userEvent.click(triggerOf(internet, 'Internet'));

    expect(within(diarista).getByText('Nenhuma transação vinculada neste mês')).toBeInTheDocument();
    expect(
      within(internet).getByRole('list', { name: 'Transações de Internet' }),
    ).toBeInTheDocument();
    expect(within(internet).getByRole('button', { name: /^Atualizar para/ })).toBeInTheDocument();
  });

  it('says "Nenhuma transação vinculada" with no month for a late one brought from an earlier month', async () => {
    const recurrence = db.recurrences.find((item) => item.name === 'Academia');
    const lastMonth = db.occurrences.find(
      (item) => item.recurrenceId === recurrence?.id && item.month < CURRENT_MONTH,
    );
    if (!lastMonth) throw new Error('No earlier occurrence of Academia');
    lastMonth.payments = [];
    lastMonth.settledAt = null;

    renderApp(URL);
    const attention = await findAttention();
    const carried = within(attention)
      .getAllByRole('button', { name: 'Transações de Academia' })
      .map((button) => button.closest('li'))
      .find((li) => li?.textContent?.includes('Venceu'));
    if (!carried) throw new Error('No carried over card');

    await userEvent.click(triggerOf(carried, 'Academia'));

    expect(within(carried).getByText('Nenhuma transação vinculada')).toBeInTheDocument();
    expect(within(carried).queryByText(/neste mês/)).toBeNull();
  });

  describe('isolation of the open button', () => {
    async function findLateIncome() {
      makeOccurrenceLate('Lume Design (freela)');
      renderApp(INCOME_URL);
      const lume = cardOf(await findAttention(), 'Lume Design (freela)');

      return { lume, trigger: triggerOf(lume, 'Lume Design (freela)') };
    }

    it('keeps the menu and the action buttons outside of the open button, side by side with it', async () => {
      const { lume, trigger } = await findLateIncome();
      const menu = within(lume).getByRole('button', { name: 'Ações de Lume Design (freela)' });
      const link = within(lume).getByRole('button', { name: 'Vincular transação' });
      const done = within(lume).getByRole('button', { name: 'Marcar como recebida' });

      // None is inside another, so a press on one never reaches the other.
      for (const button of [menu, link, done]) {
        expect(trigger).not.toContainElement(button);
        expect(button).not.toContainElement(trigger);
      }
      // They sit after the open button, so they draw above its overlay.
      for (const button of [menu, link, done]) {
        expect(
          trigger.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    });

    it('does not open the card when the "…" menu is pressed with the mouse or the keyboard', async () => {
      const { lume, trigger } = await findLateIncome();
      const menu = within(lume).getByRole('button', { name: 'Ações de Lume Design (freela)' });

      await userEvent.click(menu);
      expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await userEvent.keyboard('{Escape}');

      menu.focus();
      await userEvent.keyboard('{Enter}');
      expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await userEvent.keyboard('{Escape}');

      menu.focus();
      await userEvent.keyboard(' ');
      expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it.each([
      ['with the mouse', (button: HTMLElement) => userEvent.click(button)],
      ['with Enter', () => userEvent.keyboard('{Enter}')],
      ['with Space', () => userEvent.keyboard(' ')],
    ])('does not open the card when "Vincular transação" is pressed %s', async (_how, press) => {
      const { lume, trigger } = await findLateIncome();
      const link = within(lume).getByRole('button', { name: 'Vincular transação' });
      link.focus();

      await press(link);

      expect(await screen.findByRole('dialog', { name: 'Vincular transação' })).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('does not open the card when "Marcar como recebida" is pressed', async () => {
      const { lume, trigger } = await findLateIncome();

      await userEvent.click(within(lume).getByRole('button', { name: 'Marcar como recebida' }));

      expect(
        await screen.findByText('Lume Design (freela) marcada como recebida.'),
      ).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('list', { name: 'Transações de Lume Design (freela)' })).toBeNull();
    });
  });
});
