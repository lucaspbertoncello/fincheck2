import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  invoiceDetailDtoSchema,
  invoiceDtoSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';

// The expected recurrences of a card enter its invoices (RF-INV-003, `RecurrenceExpectationReader`).
// The card closes on the 5th and is due on the 12th: a day up to the 5th falls in the invoice of
// that month, a later day in the next one. Today is 22/10/2026, so `2026-11` is the open invoice.
describe('the recurrences expected on the invoices of a card', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const onCard = (overrides: Record<string, unknown> = {}) =>
    world.create({
      name: 'Netflix',
      accountId: world.card,
      method: 'credit',
      expectedAmountCents: 5590,
      ...overrides,
    });
  const invoices = async (from = '2026-10', to = '2027-02') => {
    const response = await world.send('GET', `/cards/${world.card}/invoices?from=${from}&to=${to}`);
    expect(response.status).toBe(200);

    return listResponseSchema(invoiceDtoSchema).parse(await response.json()).items;
  };
  const expectedBy = async () =>
    Object.fromEntries(
      (await invoices()).map((invoice) => [
        invoice.month,
        invoice.breakdown.expectedRecurringCents,
      ]),
    );

  it('puts each occurrence in the invoice its expected day falls in, by the cycle of the card', async () => {
    // The 4th and the 5th are up to the closing (inclusive): the invoice of that month. The 6th is
    // after it: the invoice of the next month.
    await onCard({
      name: 'No dia 4',
      dateRule: { type: 'fixed_day', day: 4 },
      expectedAmountCents: 100,
    });
    await onCard({
      name: 'No dia 5',
      dateRule: { type: 'fixed_day', day: 5 },
      expectedAmountCents: 200,
    });
    await onCard({
      name: 'No dia 6',
      dateRule: { type: 'fixed_day', day: 6 },
      expectedAmountCents: 400,
    });

    // October is a closed invoice: nothing is expected on it. The invoice of November takes the 04
    // and 05 of November and the 06 of October (after the closing of 05/10); December takes the 04
    // and 05 of December and the 06 of November, and January the same.
    expect(await expectedBy()).toMatchObject({
      '2026-10': 0,
      '2026-11': 100 + 200 + 400,
      '2026-12': 100 + 200 + 400,
      '2027-01': 100 + 200 + 400,
    });
  });

  it('puts an occurrence with no expected day in the invoice of its own month', async () => {
    await onCard({ name: 'Sem dia', dateRule: { type: 'any_day' }, expectedAmountCents: 700 });

    expect(await expectedBy()).toMatchObject({ '2026-11': 700, '2026-12': 700, '2027-01': 700 });
  });

  it('counts only what is left of an occurrence that was partly paid', async () => {
    const { occurrence } = await onCard({
      name: 'Parcelada',
      dateRule: { type: 'fixed_day', day: 25 },
      expectedAmountCents: 10000,
      maxPayments: 2,
    });
    const part = await insertTestExpense(world.database.db, world.card, {
      cents: 4000,
      on: '2026-10-25',
      overrides: { method: 'credit', invoice_month: '2026-11' },
    });
    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: part });

    const november = (await invoices()).find((invoice) => invoice.month === '2026-11');

    // R$ 100,00 expected, R$ 40,00 charged: R$ 40,00 in the purchases and R$ 60,00 still expected,
    // so the same expense is not counted twice.
    expect(november?.breakdown).toMatchObject({
      purchasesCents: 4000,
      expectedRecurringCents: 6000,
    });
    expect(november?.totalCents).toBe(10000);
  });

  it('counts nothing once the charge came and confirmed the occurrence', async () => {
    const { occurrence } = await onCard({ dateRule: { type: 'fixed_day', day: 25 } });
    const charge = await insertTestExpense(world.database.db, world.card, {
      cents: 5590,
      on: '2026-10-25',
      overrides: { method: 'credit', invoice_month: '2026-11' },
    });
    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: charge });

    const november = (await invoices()).find((invoice) => invoice.month === '2026-11');

    expect(november?.breakdown).toMatchObject({ purchasesCents: 5590 });
    // The October occurrence is confirmed: only the ones of November on count.
    expect(november?.breakdown.expectedRecurringCents).toBe(0);
  });

  it('counts a late occurrence, and not a skipped or a settled one', async () => {
    await onCard({
      name: 'Atrasada',
      dateRule: { type: 'fixed_day', day: 25 },
      expectedAmountCents: 100,
    });
    const skipped = await onCard({
      name: 'Dispensada',
      dateRule: { type: 'fixed_day', day: 25 },
      expectedAmountCents: 200,
    });
    const settled = await onCard({
      name: 'Marcada',
      dateRule: { type: 'fixed_day', day: 25 },
      expectedAmountCents: 400,
    });
    await world.send('POST', `/occurrences/${skipped.occurrence?.id}/skip`);
    await world.send('POST', `/occurrences/${settled.occurrence?.id}/settle`);

    // On 02/11 the window of the 25/10 occurrence (to 28/10) has ended: it is late, and it falls in
    // the invoice that closes on 05/11, which is still open.
    const later = world.at('2026-11-02T15:00:00.000Z');
    const response = await later('GET', `/cards/${world.card}/invoices?from=2026-11&to=2026-12`);
    const items = listResponseSchema(invoiceDtoSchema).parse(await response.json()).items;

    // The late one (R$ 1,00) counts; the skipped and the settled ones do not.
    expect(
      items.find((invoice) => invoice.month === '2026-11')?.breakdown.expectedRecurringCents,
    ).toBe(100);
  });

  it('counts nothing for an invoice that is closed, a deleted recurrence, an income, another card or a checking account', async () => {
    const deleted = await onCard({ name: 'Excluída', expectedAmountCents: 111 });
    await world.send('DELETE', `/recurrences/${deleted.recurrence.id}`);
    await world.create({
      kind: 'income',
      name: 'Receita',
      accountId: world.card,
      expectedAmountCents: 222,
    });
    await world.create({ name: 'Na conta', accountId: world.checking, expectedAmountCents: 333 });
    const otherCard = await insertTestAccount(world.database.db, {
      type: 'credit_card',
      name: 'Outro cartão',
    });
    await world.database.db
      .insertInto('credit_cards')
      .values({
        account_id: otherCard,
        brand: 'visa',
        last4: '4321',
        closing_day: 5,
        due_day: 12,
        limit_cents: null,
        theme_id: null,
      })
      .execute();
    await world.create({ name: 'No outro cartão', accountId: otherCard, expectedAmountCents: 444 });

    expect(Object.values(await expectedBy()).every((cents) => cents === 0)).toBe(true);
  });

  it('shows the occurrence as a line of the invoice, with the day and what is left', async () => {
    await onCard({ dateRule: { type: 'fixed_day', day: 21 } });

    const response = await world.send('GET', `/cards/${world.card}/invoices/2026-12`);
    const detail = invoiceDetailDtoSchema.parse(await response.json());

    // The 21st of November falls after the closing of 05/11: it is in the invoice of December.
    expect(detail.items).toEqual([
      expect.objectContaining({
        type: 'expected_recurrence',
        recurrenceName: 'Netflix',
        expectedOn: '2026-11-21',
        amountCents: 5590,
      }),
    ]);
  });

  it('follows the cycle of the card at the end of the year: 28/12 falls in the invoice of January', async () => {
    await onCard({ dateRule: { type: 'fixed_day', day: 28 } });

    const by = await expectedBy();

    expect(by['2027-01']).toBe(5590);
  });

  it('adds the expected recurrences to the total of the open invoice and of the projected ones', async () => {
    await onCard({ dateRule: { type: 'fixed_day', day: 21 } });

    const november = (await invoices()).find((invoice) => invoice.month === '2026-11');

    expect(november).toMatchObject({ status: 'open', computedTotalCents: 5590, totalCents: 5590 });
  });
});
