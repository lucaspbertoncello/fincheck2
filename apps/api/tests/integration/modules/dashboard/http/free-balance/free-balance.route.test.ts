import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { agendaDtoSchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { invoiceDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createApp } from '#/main/http/create-app.util.ts';
import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';
import { seedExampleOne } from '#tests/support/dashboard/dashboard/seed-example-one.util.ts';

describe('GET /dashboard/free-balance', () => {
  let world: DashboardTestWorld;

  beforeEach(async () => {
    world = await createDashboardTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const free = () => world.get('/dashboard/free-balance', freeBalanceDtoSchema);

  it('answers 200 with an empty Livre when there is nothing', async () => {
    const dto = await free();

    expect(dto).toMatchObject({
      asOfOn: '2026-10-22',
      daysRemaining: 10,
      freeBalanceCents: 0,
      perDayCents: 0,
      isPartial: false,
      accountsWithoutBalance: [],
      accounts: { totalCents: 0, items: [] },
      receivable: { totalCents: 0, items: [] },
      payable: { totalCents: 0, items: [] },
      dataFreshness: [],
      review: { count: 0, byAccount: [] },
    });
  });

  it('is R$ 7.707,29 in the example of the contract (balance + to receive - to pay), R$ 770,73 a day', async () => {
    await seedExampleOne(world);

    const dto = await free();

    expect(dto.accounts.totalCents).toBe(540898);
    expect(dto.receivable.totalCents).toBe(462500);
    expect(dto.payable.totalCents).toBe(232669);
    expect(dto.freeBalanceCents).toBe(770729);
    expect(dto.daysRemaining).toBe(10);
    expect(dto.perDayCents).toBe(77073);
    expect(dto.accounts.items.map((item) => [item.name, item.balanceCents])).toEqual(
      expect.arrayContaining([
        ['Nubank conta', 341258],
        ['Bradesco conta', 187640],
        ['Carteira', 12000],
      ]),
    );
  });

  it('composes the "A pagar" as the contract says, and does not count the card twice', async () => {
    await seedExampleOne(world);

    const { payable, receivable } = await free();

    expect(payable.items.map((item) => [item.title, item.remainingCents])).toEqual([
      ['Diarista', 18000],
      ['Academia', 10990],
      ['Internet', 11990],
      ['Você deve a Rafa', 30000],
      ['Fatura Nubank', 161689],
    ]);
    // The Celular is in the invoice: it is not an item of its own, and the invoice already has it.
    expect(payable.items.some((item) => item.title === 'Celular')).toBe(false);
    expect(receivable.items.map((item) => [item.title, item.remainingCents])).toEqual([
      ['Maxxy', 420000],
      ['Mesada', 42500],
    ]);
  });

  it('does not change when Lucas ties the payment found to the Bradesco invoice (the same number, before and after)', async () => {
    const seeds = await seedExampleOne(world);
    const before = await free();

    const response = await world.send(
      'POST',
      `/cards/${seeds.bradescoCard}/invoices/2026-10/payments`,
      { amountCents: 128490, paidOn: '2026-10-21', transactionId: seeds.bradescoPayment },
    );
    expect(response.status).toBe(201);

    expect((await free()).freeBalanceCents).toBe(before.freeBalanceCents);
    expect((await free()).payable.totalCents).toBe(232669);
  });

  it('counts the debit before the link as the invoice paid, and counts the invoice in full when Lucas says "not this one"', async () => {
    const seeds = await seedExampleOne(world);

    const dismissed = await world.send(
      'POST',
      `/cards/${seeds.bradescoCard}/invoices/2026-10/payment-suggestion/dismiss`,
      { transactionId: seeds.bradescoPayment },
    );
    expect(dismissed.status).toBe(200);

    // The invoice is a debt of R$ 1.284,90 again, and the money that left is not a payment of it.
    expect((await free()).payable.totalCents).toBe(232669 + 128490);
  });

  describe('the occurrences that fall due by the end of the month but belong to another one', () => {
    // 00:30 of 01/10 in São Paulo.
    const firstOfOctober = '2026-10-01T03:30:00.000Z';
    const rent = (accountId: string, overrides: Record<string, unknown>, at: string) =>
      world.recurrence(
        {
          name: 'Aluguel',
          expectedAmountCents: 100000,
          accountId,
          method: 'debit',
          ...overrides,
        },
        world.at(at),
      );

    it('counts the rent of the 29th of September on the 1st of October, with the one of October (R$ 3.000,00, not R$ 4.000,00)', async () => {
      const account = await world.bankAccount('Conta', 500000);
      // Born in September: the occurrence of the 29th is open and its window runs to the 2nd.
      await rent(
        account,
        { dateRule: { type: 'fixed_day', day: 29 }, startsMonth: '2026-09' },
        '2026-09-22T15:00:00.000Z',
      );

      const dto = await world.get(
        '/dashboard/free-balance',
        freeBalanceDtoSchema,
        world.at(firstOfOctober),
      );

      expect(
        dto.payable.items.map((item) => [item.title, item.dueOn, item.remainingCents]),
      ).toEqual([
        ['Aluguel', '2026-09-29', 100000],
        ['Aluguel', '2026-10-29', 100000],
      ]);
      expect(dto.freeBalanceCents).toBe(300000);
      // The same on the timeline: the last day is the Livre.
      const timeline = await world.get(
        '/dashboard/timeline?month=2026-10',
        timelineDtoSchema,
        world.at(firstOfOctober),
      );
      expect(timeline.endBalanceCents).toBe(300000);
      // And when the window closes (06/10) nothing changes: it is the one that came along, late.
      const later = await world.get(
        '/dashboard/free-balance',
        freeBalanceDtoSchema,
        world.at('2026-10-06T15:00:00.000Z'),
      );
      expect(later.freeBalanceCents).toBe(300000);
    });

    it('counts the rent of the 1st of November that moved back to Friday the 30th of October', async () => {
      const account = await world.bankAccount('Conta', 500000);
      // 01/11/2026 is a Sunday and the 31st a Saturday: "before" takes it to Friday 30/10. The
      // occurrence of 01/10 is open and late.
      await rent(
        account,
        {
          dateRule: { type: 'fixed_day', day: 1, nonBusinessDayShift: 'before' },
          startsMonth: '2026-10',
        },
        '2026-10-02T15:00:00.000Z',
      );

      const dto = await world.get('/dashboard/free-balance', freeBalanceDtoSchema);

      expect(dto.payable.items.map((item) => [item.title, item.dueOn])).toEqual([
        ['Aluguel', '2026-10-01'],
        ['Aluguel', '2026-10-30'],
      ]);
      expect(dto.freeBalanceCents).toBe(300000);
      const timeline = await world.get('/dashboard/timeline?month=2026-10', timelineDtoSchema);
      expect(timeline.endBalanceCents).toBe(300000);
      expect(
        timeline.days.find((day) => day.date === '2026-10-30')?.items.map((item) => item.title),
      ).toEqual(['Aluguel']);
    });

    it('counts an income of the next month that moved back into this one, once', async () => {
      const account = await world.bankAccount('Conta', 100000);
      await world.recurrence(
        {
          kind: 'income',
          name: 'Salário',
          expectedAmountCents: 400000,
          dateRule: { type: 'fixed_day', day: 1, nonBusinessDayShift: 'before' },
          startsMonth: '2026-11',
          accountId: account,
          method: 'pix',
        },
        world.at('2026-10-02T15:00:00.000Z'),
      );

      const dto = await world.get('/dashboard/free-balance', freeBalanceDtoSchema);

      expect(dto.receivable.items.map((item) => [item.title, item.dueOn])).toEqual([
        ['Salário', '2026-10-30'],
      ]);
      expect(dto.freeBalanceCents).toBe(500000);
    });

    it('does not count one that is late for more than 3 months, but counts the ones of the last 3', async () => {
      const account = await world.bankAccount('Conta', 500000);
      // 05/06 to 05/10: June is 4 months back, July, August and September are the 3 that come along.
      await rent(
        account,
        {
          name: 'Diarista',
          expectedAmountCents: 10000,
          dateRule: { type: 'fixed_day', day: 5 },
          startsMonth: '2026-06',
        },
        '2026-06-10T15:00:00.000Z',
      );

      const dto = await world.get('/dashboard/free-balance', freeBalanceDtoSchema);

      expect(dto.payable.items.map((item) => item.dueOn)).toEqual([
        '2026-07-05',
        '2026-08-05',
        '2026-09-05',
        '2026-10-05',
      ]);
      expect(dto.freeBalanceCents).toBe(460000);
      const timeline = await world.get('/dashboard/timeline?month=2026-10', timelineDtoSchema);
      expect(timeline.endBalanceCents).toBe(460000);
    });

    it('does not count the occurrences of a paused recurrence, the late one that stayed included', async () => {
      const account = await world.bankAccount('Conta', 500000);
      const created = await rent(
        account,
        { dateRule: { type: 'fixed_day', day: 29 }, startsMonth: '2026-09' },
        '2026-09-22T15:00:00.000Z',
      );
      // R$ 400,00 paid of the 29th of September: it is history, so pausing keeps it.
      const partial = await world.expense(account, 40000, '2026-09-29');
      const linked = await world.send('POST', `/occurrences/${created.occurrence?.id}/payments`, {
        transactionId: partial,
      });
      expect(linked.status).toBe(201);
      const paused = await world.at(firstOfOctober)(
        'POST',
        `/recurrences/${created.recurrence.id}/pause`,
      );
      expect(paused.status).toBe(200);

      const dto = await world.get(
        '/dashboard/free-balance',
        freeBalanceDtoSchema,
        world.at(firstOfOctober),
      );

      expect(dto.payable.items).toEqual([]);
      expect(dto.freeBalanceCents).toBe(500000);
    });

    it('does not count a paused recurrence on a card either (it leaves the invoice, so the Livre and the projection), and counts it again once it resumes', async () => {
      await world.bankAccount('Conta', 500000);
      const card = await world.card('Cartão', 28, 5);
      // R$ 50,00 on the card on the 25th: the occurrence of October is expected, and falls in the
      // invoice that closes on the 28th. Pausing keeps that occurrence (R8), the invoice must not.
      const created = await world.recurrence({
        name: 'Streaming',
        expectedAmountCents: 5000,
        accountId: card,
        method: 'credit',
        dateRule: { type: 'fixed_day', day: 25 },
        startsMonth: '2026-10',
      });
      expect((await free()).freeBalanceCents).toBe(495000);

      const paused = await world.send('POST', `/recurrences/${created.recurrence.id}/pause`);
      expect(paused.status).toBe(200);

      const dto = await free();
      expect(dto.payable.items).toEqual([]);
      expect(dto.freeBalanceCents).toBe(500000);
      const timeline = await world.get('/dashboard/timeline?month=2026-10', timelineDtoSchema);
      expect(timeline.endBalanceCents).toBe(500000);
      const invoices = await world.get(
        `/cards/${card}/invoices?from=2026-10&to=2026-11`,
        listResponseSchema(invoiceDtoSchema),
      );
      expect(invoices.items.map((invoice) => invoice.breakdown.expectedRecurringCents)).toEqual([
        0, 0,
      ]);

      const resumed = await world.send('POST', `/recurrences/${created.recurrence.id}/resume`);
      expect(resumed.status).toBe(200);
      expect((await free()).freeBalanceCents).toBe(495000);
    });
  });

  it('takes the day of São Paulo: 23:59 of the 22nd is still 10 days to the end of the month, 00:00 of the 23rd is 9', async () => {
    await world.bankAccount('Conta', 100000);

    const beforeMidnight = await world.get(
      '/dashboard/free-balance',
      freeBalanceDtoSchema,
      world.at('2026-10-23T02:59:00.000Z'),
    );
    const afterMidnight = await world.get(
      '/dashboard/free-balance',
      freeBalanceDtoSchema,
      world.at('2026-10-23T03:00:00.000Z'),
    );

    expect([
      beforeMidnight.asOfOn,
      beforeMidnight.daysRemaining,
      beforeMidnight.perDayCents,
    ]).toEqual(['2026-10-22', 10, 10000]);
    expect([afterMidnight.asOfOn, afterMidnight.daysRemaining, afterMidnight.perDayCents]).toEqual([
      '2026-10-23',
      9,
      11111,
    ]);
  });

  it('counts the last day of the month and of a leap February as one day', async () => {
    await world.bankAccount('Conta', 90000);

    const october = await world.get(
      '/dashboard/free-balance',
      freeBalanceDtoSchema,
      world.at('2026-10-31T15:00:00.000Z'),
    );
    const leap = await world.get(
      '/dashboard/free-balance',
      freeBalanceDtoSchema,
      world.at('2028-02-29T15:00:00.000Z'),
    );
    const february = await world.get(
      '/dashboard/free-balance',
      freeBalanceDtoSchema,
      world.at('2026-02-01T15:00:00.000Z'),
    );

    expect([october.daysRemaining, october.perDayCents]).toEqual([1, 90000]);
    expect(leap.daysRemaining).toBe(1);
    expect([february.daysRemaining, february.perDayCents]).toEqual([28, 3214]);
  });

  it('shows a bank account without a balance yet as partial', async () => {
    const id = await world.bankAccount('Inter', null);

    const dto = await free();

    expect(dto.isPartial).toBe(true);
    expect(dto.accountsWithoutBalance).toEqual([id]);
    expect(dto.accounts.items).toEqual([
      expect.objectContaining({ accountId: id, balanceCents: 0 }),
    ]);
  });

  it('leaves out the cards and the archived accounts from the balance', async () => {
    await world.bankAccount('Nubank conta', 100000);
    await world.bankAccount('Antiga', 99999, { archived_at: '2026-09-01T00:00:00.000Z' });
    await world.card('Nubank', 30, 6);

    const dto = await free();

    expect(dto.accounts.totalCents).toBe(100000);
    expect(dto.accounts.items).toHaveLength(1);
  });

  it('counts the whole queue "Para revisar" and says which account it is in', async () => {
    const account = await world.bankAccount('Nubank conta', 0);
    await world.expense(account, 1000, '2026-10-10');
    await world.expense(account, 2000, '2026-09-10');
    const category = await world.category();
    await world.expense(account, 3000, '2026-10-11', { categoryId: category });

    const { review } = await free();

    expect(review).toEqual({ count: 2, byAccount: [{ accountId: account, count: 2 }] });
  });

  it('does not count a late recurring expense on the card whose invoice already closed: the invoice does not carry it (P4-9 of the review of the recurrences, decision of the PM pending)', async () => {
    // The card closes on the 5th: on 22/10 the invoice 2026-10 is closed, and the Celular, expected
    // on the 3rd, is late. The invoice of a closed month no longer adds what was expected of it, so
    // the late R$ 40,00 is in no invoice; the one of November (03/11) is in the open invoice.
    const card = await world.card('Nubank', 5, 12);
    await world.recurrence({
      name: 'Celular',
      expectedAmountCents: 4000,
      dateRule: { type: 'fixed_day', day: 3 },
      accountId: card,
      method: 'credit',
    });

    const dto = await free();
    const agenda = await world.get('/agenda?month=2026-10', agendaDtoSchema);

    expect(dto.payable.items.map((item) => [item.title, item.remainingCents])).toEqual([
      ['Fatura Nubank', 4000],
    ]);
    // It does not disappear: the agenda shows it late, "already in the invoice".
    expect(agenda.thisMonth).toEqual([
      expect.objectContaining({
        title: 'Celular',
        state: 'overdue',
        remainingCents: 4000,
        countsInFreeBalance: false,
      }),
    ]);
  });

  it('answers 401 without the local token', async () => {
    const app = createApp({ db: world.db, localToken: 'a-local-token-of-the-test-0123456789' });

    const response = await app.request('/dashboard/free-balance', {
      headers: { [LOCAL_TOKEN_HEADER]: 'another' },
    });

    expect(response.status).toBe(401);
  });
});
