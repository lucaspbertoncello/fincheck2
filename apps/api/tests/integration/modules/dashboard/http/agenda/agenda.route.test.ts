import { agendaDtoSchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';
import { seedExampleOne } from '#tests/support/dashboard/dashboard/seed-example-one.util.ts';

describe('GET /agenda', () => {
  let world: DashboardTestWorld;
  // The day the bills of these tests were created: the window of the presumed payment starts there.
  const created = () => world.at('2026-10-01T15:00:00.000Z');

  beforeEach(async () => {
    world = await createDashboardTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const agenda = (month = '2026-10', request = world.send) =>
    world.get(`/agenda?month=${month}`, agendaDtoSchema, request);
  const free = () => world.get('/dashboard/free-balance', freeBalanceDtoSchema);

  it('has the "A pagar" of the current month equal to the one of the Livre, item by item', async () => {
    await seedExampleOne(world);

    const dto = await agenda();
    const livre = await free();

    expect(dto.payable.totalCents).toBe(livre.payable.totalCents);
    expect(dto.payable.totalCents).toBe(232669);
    expect(dto.payable.count).toBe(5);
    expect(dto.payable.items).toEqual(livre.payable.items);
  });

  it('shows the Bradesco invoice as paid but not tied: the presumed payment, the payment found with its text, nothing left to pay', async () => {
    const seeds = await seedExampleOne(world);

    const dto = await agenda();

    const bradesco = dto.openInvoices.find((item) => item.title === 'Fatura Bradesco');
    expect(bradesco).toMatchObject({
      key: `invoice:${seeds.bradescoCard}:2026-10`,
      source: {
        type: 'invoice',
        accountId: seeds.bradescoCard,
        month: '2026-10',
        billId: null,
        occurrenceId: null,
      },
      amountCents: 128490,
      paidCents: 0,
      presumedPaidCents: 128490,
      presumedTransactionId: seeds.bradescoPayment,
      remainingCents: 0,
      state: 'upcoming',
      invoiceState: 'closed',
      dueOn: '2026-10-28',
      countsInFreeBalance: true,
      paymentFound: {
        transactionId: seeds.bradescoPayment,
        accountId: seeds.bradesco,
        amountCents: -128490,
        occurredOn: '2026-10-21',
        description: 'PAGAMENTO FATURA',
      },
    });
    expect(dto.payable.items.some((item) => item.title === 'Fatura Bradesco')).toBe(false);
    const nubank = dto.openInvoices.find((item) => item.title === 'Fatura Nubank');
    expect(nubank).toMatchObject({
      remainingCents: 161689,
      invoiceState: 'open',
      paymentFound: null,
    });
    expect(dto.openInvoices.map((item) => item.dueOn)).toEqual(['2026-10-28', '2026-11-06']);
  });

  it('lists "Este mês" with the expense on the card marked as already in the invoice, and the bills to receive', async () => {
    await seedExampleOne(world);
    await world.bill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      description: 'Jantar',
      amountCents: 11600,
      dueOn: '2026-10-15',
    });
    await world.bill({ description: 'Condomínio', amountCents: 50000 });

    const dto = await agenda();

    expect(dto.thisMonth.map((item) => [item.title, item.countsInFreeBalance])).toEqual([
      ['Diarista', true],
      ['Academia', true],
      ['Celular', false],
      ['Internet', true],
      ['Você deve a Rafa', true],
    ]);
    expect(
      dto.receivable.map((item) => [item.title, item.badge, item.countsInFreeBalance]),
    ).toEqual([['Júlia te deve', 'friend_receivable', false]]);
    expect(dto.friendsReceivable).toEqual({ totalCents: 11600, peopleCount: 1 });
    expect(
      dto.undated.map((item) => [item.title, item.remainingCents, item.countsInFreeBalance]),
    ).toEqual([['Condomínio', 50000, false]]);
    // The friend and the bill with no day are not in the Livre.
    expect((await free()).freeBalanceCents).toBe(770729);
  });

  it('presumes the payment of a bill: the only transaction of the same value in the window leaves nothing to pay and does not change the Livre by the bill twice', async () => {
    const account = await world.bankAccount('Conta', 100000);
    const bill = await world.bill(
      { description: 'Condomínio', amountCents: 30000, dueOn: '2026-10-28' },
      created(),
    );
    const before = await free();
    expect(before.freeBalanceCents).toBe(100000 - 30000);

    const pix = await world.expense(account, 30000, '2026-10-21', {
      description: 'PIX CONDOMINIO',
    });

    const dto = await agenda();
    const item = dto.thisMonth.find((entry) => entry.source.billId === bill.id);
    expect(item).toMatchObject({
      presumedPaidCents: 30000,
      presumedTransactionId: pix,
      remainingCents: 0,
      paidCents: 0,
      state: 'upcoming',
    });
    // The balance of the bank is the same number here: the point is the bill is no longer a debt.
    expect((await free()).payable.totalCents).toBe(0);
  });

  it('leaves the bill whole when two transactions fit, when "Não é este" was said, when the Pix is tied to another bill or for another person', async () => {
    const account = await world.bankAccount('Conta', 0);
    const bill = await world.bill(
      { description: 'Condomínio', amountCents: 30000, dueOn: '2026-10-28' },
      created(),
    );
    const first = await world.expense(account, 30000, '2026-10-21');
    const second = await world.expense(account, 30050, '2026-10-22');

    expect((await agenda()).payable.totalCents).toBe(30000);

    const dismiss = await world.send('POST', `/bills/${bill.id}/payment-suggestion/dismiss`, {
      transactionId: second,
    });
    expect(dismiss.status).toBeLessThan(300);
    // Only the first is left, and it is a candidate again.
    expect((await agenda()).thisMonth[0]).toMatchObject({
      presumedTransactionId: first,
      remainingCents: 0,
    });

    const dismissFirst = await world.send('POST', `/bills/${bill.id}/payment-suggestion/dismiss`, {
      transactionId: first,
    });
    expect(dismissFirst.status).toBeLessThan(300);
    expect((await agenda()).thisMonth[0]).toMatchObject({
      presumedPaidCents: 0,
      presumedTransactionId: null,
      remainingCents: 30000,
    });
  });

  it('asks for the name of the person: a friend debt only presumes a Pix that carries the name', async () => {
    const account = await world.bankAccount('Conta', 0);
    await world.bill(
      {
        kind: 'friend',
        counterparty: 'Rafa',
        description: 'Ingresso',
        amountCents: 20000,
        dueOn: '2026-10-28',
      },
      created(),
    );
    await world.expense(account, 20000, '2026-10-21', { description: 'PIX ENVIADO CARLOS' });

    expect((await agenda()).thisMonth[0]).toMatchObject({
      presumedPaidCents: 0,
      remainingCents: 20000,
    });

    const pix = await world.expense(account, 20000, '2026-10-22', {
      description: 'PIX ENVIADO RAFA SILVA',
    });

    expect((await agenda()).thisMonth[0]).toMatchObject({
      presumedTransactionId: pix,
      remainingCents: 0,
    });
  });

  it('gives a transaction to one item only: the invoice that falls due first takes it, and the bill counts in full', async () => {
    const account = await world.bankAccount('Conta', 0);
    const card = await world.card('Nubank', 20, 28);
    await world.purchase(card, 30000, '2026-10-05', '2026-10');
    const debit = await world.invoicePaymentDebit(account, 30000, '2026-10-21');
    await world.bill(
      { description: 'Condomínio', amountCents: 30000, dueOn: '2026-10-30' },
      created(),
    );

    const dto = await agenda();

    expect(dto.openInvoices[0]).toMatchObject({ presumedTransactionId: debit, remainingCents: 0 });
    expect(dto.thisMonth[0]).toMatchObject({ presumedTransactionId: null, remainingCents: 30000 });
  });

  it('has what was settled in the month, the last first: a bill, an invoice and a recurring expense', async () => {
    const account = await world.bankAccount('Conta', 0);
    const card = await world.card('Nubank', 5, 12);
    await world.purchase(card, 20000, '2026-09-20', '2026-10');
    const bill = await world.bill({
      description: 'Condomínio',
      amountCents: 30000,
      dueOn: '2026-10-10',
    });
    const pix = await world.expense(account, 30000, '2026-10-12', { description: 'PIX' });
    expect(
      (await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix })).status,
    ).toBe(201);
    const pay = await world.send('POST', `/cards/${card}/invoices/2026-10/payments`, {
      amountCents: 20000,
      paidOn: '2026-10-15',
    });
    expect(pay.status).toBe(201);
    const gym = await world.recurrence({
      name: 'Academia',
      expectedAmountCents: 10990,
      dateRule: { type: 'fixed_day', day: 8 },
      accountId: account,
      method: 'debit',
    });
    expect(
      (await world.send('POST', `/occurrences/${gym.occurrence?.id}/settle`)).status,
    ).toBeLessThan(300);

    const dto = await agenda();

    // The recurring expense was marked by hand today (22/10), the others on the day of the payment.
    expect(dto.settled.map((item) => [item.title, item.settledOn, item.state])).toEqual([
      ['Academia', '2026-10-22', 'settled'],
      ['Fatura Nubank', '2026-10-15', 'settled'],
      ['Condomínio', '2026-10-12', 'settled'],
    ]);
    expect(dto.payable.totalCents).toBe(0);
    expect((await agenda('2026-09')).settled).toEqual([]);

    // The same settled things are the "happened" of the timeline, on the day they happened.
    const timeline = await world.get('/dashboard/timeline?month=2026-10', timelineDtoSchema);
    const happened = timeline.days.flatMap((day) =>
      day.items
        .filter((item) => item.state === 'happened')
        .map((item) => [day.date, item.title, item.amountCents]),
    );
    expect(happened).toEqual(
      expect.arrayContaining([
        ['2026-10-15', 'Fatura Nubank', 20000],
        ['2026-10-12', 'Condomínio', 30000],
      ]),
    );
  });

  it('is empty in an empty database, and has what falls due in another month', async () => {
    expect(await agenda()).toEqual({
      month: '2026-10',
      payable: { totalCents: 0, count: 0, items: [] },
      friendsReceivable: { totalCents: 0, peopleCount: 0 },
      thisMonth: [],
      openInvoices: [],
      receivable: [],
      undated: [],
      settled: [],
    });
    await world.bill({ description: 'Seguro', amountCents: 9000, dueOn: '2026-11-10' });

    expect((await agenda('2026-11')).payable).toMatchObject({ totalCents: 9000, count: 1 });
    expect((await agenda('2026-10')).payable.totalCents).toBe(0);
  });

  it('answers 400 for a bad month and 401 without the token', async () => {
    await world.expectError(await world.send('GET', '/agenda'), 400, 'VALIDATION_FAILED');
    await world.expectError(
      await world.send('GET', '/agenda?month=outubro'),
      400,
      'VALIDATION_FAILED',
    );
    await world.expectError(
      await world.send('GET', '/agenda?month=2026-10', undefined, { 'x-fincheck-token': 'x' }),
      401,
      'LOCAL_TOKEN_INVALID',
    );
  });

  it('lists in "Quitadas" a recurring expense of an earlier month paid in this one, on the day it was paid', async () => {
    const account = await world.bankAccount('Conta', 500000);
    // Born in September (the 25th) and marked as paid today, 22/10: the occurrence is September's.
    const gym = await world.recurrence(
      {
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 25 },
        startsMonth: '2026-09',
        accountId: account,
        method: 'debit',
      },
      world.at('2026-09-22T15:00:00.000Z'),
    );
    expect(
      (await world.send('POST', `/occurrences/${gym.occurrence?.id}/settle`)).status,
    ).toBeLessThan(300);

    const october = await agenda('2026-10');

    expect(october.settled.map((item) => [item.title, item.settledOn, item.state])).toEqual([
      ['Academia', '2026-10-22', 'settled'],
    ]);
    // Only October's own one stays to pay, and the one of September is no longer asked for.
    expect(october.thisMonth.map((item) => [item.title, item.dueOn])).toEqual([
      ['Academia', '2026-10-25'],
    ]);
    // It was paid in October, so September does not list it.
    expect((await agenda('2026-09')).settled).toEqual([]);

    const strip = await world.get(
      '/dashboard/timeline?month=2026-10&scope=recurrences',
      timelineDtoSchema,
    );
    expect(
      strip.days.flatMap((day) =>
        day.items.filter((item) => item.state === 'happened').map((item) => [day.date, item.title]),
      ),
    ).toEqual([['2026-10-22', 'Academia']]);
    const all = await world.get('/dashboard/timeline?month=2026-10', timelineDtoSchema);
    expect(
      all.days.flatMap((day) => day.items.filter((item) => item.state === 'happened')),
    ).toHaveLength(1);
  });

  it('answers with 40 thousand transactions of 3 years and a bill open since then (it was a 500 over 32 thousand)', async () => {
    const account = await world.bankAccount('Conta', 500000);
    // The oldest open bill: created in November 2023, due and never paid. It widens the window of
    // the transactions that may be its payment to three years.
    await world.bill(
      { description: 'Velha', amountCents: 77777, dueOn: '2026-10-01' },
      world.at('2023-11-02T15:00:00.000Z'),
    );
    const now = '2026-10-22T15:00:00.000Z';
    for (let start = 0; start < 40_000; start += 250) {
      await world.db
        .insertInto('transactions')
        .values(
          Array.from({ length: 250 }, (_, index) => {
            const n = start + index;
            const day = BusinessDate.fromParts(2023, 11, 2).addDays(Math.floor(n / 37));

            return {
              id: generateId(),
              account_id: account,
              origin: 'bank' as const,
              nature: 'expense' as const,
              nature_set_by: 'system' as const,
              method: 'debit' as const,
              description: 'Compra',
              amount_cents: -(1000 + ((n * 7919) % 49000)),
              occurred_on: day.value,
              invoice_month: null,
              bank_description: 'Compra',
              bank_amount_cents: -(1000 + ((n * 7919) % 49000)),
              bank_occurred_on: day.value,
              bank_counterparty: null,
              bank_status: 'posted' as const,
              bank_change_json: null,
              bank_changed_at: null,
              bank_removed_at: null,
              ignored_at: null,
              category_id: null,
              category_source: null,
              category_rule_id: null,
              search_text: 'COMPRA',
              edit_note: null,
              installment_plan_id: null,
              installment_number: null,
              transfer_counterpart_id: null,
              created_at: now,
              updated_at: now,
            };
          }),
        )
        .execute();
    }

    const open = await free();
    const month = await agenda();

    expect(open.payable.items.map((item) => [item.title, item.remainingCents])).toEqual([
      ['Velha', 77777],
    ]);
    expect(month.payable.items).toEqual(open.payable.items);

    // The debit that is the payment of the old bill (the only one worth R$ 777,77) is found.
    await world.expense(account, 77777, '2026-10-02', { description: 'PAGTO VELHA' });
    expect((await free()).payable.items).toEqual([]);
  }, 120_000);

  it('lists in "Quitadas" an invoice paid in this month three months after its own', async () => {
    await world.bankAccount('Conta', 0);
    const card = await world.card('Nubank', 5, 12);
    await world.purchase(card, 20000, '2026-06-20', '2026-07');
    const pay = await world.send('POST', `/cards/${card}/invoices/2026-07/payments`, {
      amountCents: 20000,
      paidOn: '2026-10-15',
    });
    expect(pay.status).toBe(201);

    const dto = await agenda();

    expect(dto.settled.map((item) => [item.title, item.settledOn])).toEqual([
      ['Fatura Nubank', '2026-10-15'],
    ]);
  });
});
