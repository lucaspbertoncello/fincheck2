import { agendaDtoSchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function agenda(month = CURRENT_MONTH) {
  return agendaDtoSchema.parse((await callApi('GET', `/agenda?month=${month}`)).json);
}

describe('GET /agenda against the API', () => {
  it('shows in "A pagar" of another month what falls due in it, and in the current one what the Livre counts', async () => {
    const next = addMonths(CURRENT_MONTH, 1);
    const view = await agenda(next);

    expect(view.payable.count).toBe(view.payable.items.length);
    expect(view.payable.items.every((item) => item.dueOn?.startsWith(next))).toBe(true);
    expect(view.payable.items.every((item) => item.flow === 'out' && item.remainingCents > 0)).toBe(
      true,
    );
    // A friend's debt to Lucas and an expense on the card are not cash that leaves on its day.
    expect(view.payable.items.some((item) => item.badge === 'friend_receivable')).toBe(false);
    const current = await agenda();
    expect(current.payable.items.every((item) => item.countsInFreeBalance)).toBe(true);
  });

  it('does not list an invoice with nothing to pay (a total of zero or a credit)', async () => {
    const before = await agenda();
    const card = before.openInvoices[0];
    if (!card?.accountId) throw new Error('seed without an open invoice');

    db.transactions = db.transactions.filter((tx) => tx.accountId !== card.accountId);
    db.invoices = db.invoices.filter((row) => row.accountId !== card.accountId);
    const after = await agenda();

    expect(after.openInvoices.some((item) => item.accountId === card.accountId)).toBe(false);
    expect(after.payable.items.some((item) => item.accountId === card.accountId)).toBe(false);
  });

  it('lists in "Este mês" a recurring expense with no day', async () => {
    const before = await agenda();
    const dated = before.thisMonth.find(
      (item) => item.source.type === 'occurrence' && item.dueOn !== null,
    );
    if (!dated?.source.occurrenceId) throw new Error('seed without a dated recurring expense');
    const record = db.occurrences.find((item) => item.id === dated.source.occurrenceId)!;
    record.expectedOn = null;

    const after = await agenda();
    const item = after.thisMonth.find((entry) => entry.key === dated.key);

    expect(item).toMatchObject({ dueOn: null });
    expect(after.thisMonth.at(-1)?.dueOn).toBeNull();
  });

  it('leaves a bill that the presumed payment covers whole as "upcoming" with nothing left', async () => {
    const view = await agenda();
    const course = view.thisMonth.find((item) => item.title === 'Mensalidade do curso');

    expect(course).toMatchObject({
      state: 'upcoming',
      remainingCents: 0,
      presumedPaidCents: 18_000,
    });
    expect(course?.presumedTransactionId).not.toBeNull();
  });

  it('counts a friend once whatever the case or the accent of the name', async () => {
    const before = await agenda();
    const friend = db.bills.find(
      (bill) => bill.kind === 'friend' && bill.direction === 'receivable',
    );
    if (!friend?.counterparty) throw new Error('seed without a friend who owes');
    db.bills.push({
      ...structuredClone(friend),
      id: newId(),
      counterparty: friend.counterparty.toUpperCase(),
      // No due day: the Pix the seed found for the first one is not presumed for this copy too.
      dueOn: null,
    });

    const after = await agenda();

    expect(after.friendsReceivable.peopleCount).toBe(before.friendsReceivable.peopleCount);
    expect(after.friendsReceivable.totalCents).toBeGreaterThan(before.friendsReceivable.totalCents);
  });

  it('lists as settled an occurrence of an earlier month that was paid in this one', async () => {
    // Only what goes out is in "Quitadas" (the money that came in is not a bill).
    const template = db.occurrences.find(
      (item) =>
        item.month === CURRENT_MONTH &&
        db.recurrences.find((recurrence) => recurrence.id === item.recurrenceId)?.kind ===
          'expense',
    );
    if (!template) throw new Error('seed without an expense occurrence');
    const earlier = {
      ...structuredClone(template),
      id: newId(),
      month: addMonths(CURRENT_MONTH, -1),
      settledAt: NOW_ISO,
      skippedAt: null,
      payments: [],
    };
    db.occurrences.push(earlier);

    const view = await agenda();

    expect(view.settled.some((item) => item.key === `occurrence:${earlier.id}`)).toBe(true);
  });
});
