import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';
import { seedExampleOne } from '#tests/support/dashboard/dashboard/seed-example-one.util.ts';

describe('GET /dashboard/month-summary', () => {
  let world: DashboardTestWorld;

  beforeEach(async () => {
    world = await createDashboardTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const summary = (month: string, request = world.send) =>
    world.get(`/dashboard/month-summary?month=${month}`, monthSummaryDtoSchema, request);

  // The numbers of BR-DSH-011 on 22/10: received R$ 3.802,00 of R$ 8.427,00, spent R$ 3.486,20 (+9,9%
  // against September until the 22nd) and a result of +R$ 315,80.
  async function seedIncomeAndSpending() {
    const account = await world.bankAccount('Nubank conta', 100000);
    const income = async (
      name: string,
      kind: 'income',
      cents: number,
      rule: object,
      pixCents?: number,
      on?: string,
    ) => {
      const created = await world.recurrence({
        kind,
        name,
        expectedAmountCents: cents,
        dateRule: rule,
        accountId: account,
        method: 'pix',
        ...(name === 'Mesada' ? { maxPayments: 2 } : {}),
      });
      if (pixCents && on) {
        const tx = await world.income(account, pixCents, on, { description: `Pix ${name}` });
        const linked = await world.send('POST', `/occurrences/${created.occurrence?.id}/payments`, {
          transactionId: tx,
        });
        expect(linked.status).toBeLessThan(300);
      }

      return created;
    };
    await income(
      'Treetools A',
      'income',
      120000,
      { type: 'fixed_day', day: 6 },
      120000,
      '2026-10-06',
    );
    await income(
      'Treetools B',
      'income',
      140000,
      { type: 'fixed_day', day: 15 },
      140000,
      '2026-10-15',
    );
    await income('Mesada', 'income', 85000, { type: 'any_day' }, 42500, '2026-10-03');
    await income('VR', 'income', 77700, { type: 'fixed_day', day: 2 }, 77700, '2026-10-02');
    await income('Maxxy', 'income', 420000, { type: 'around_day', day: 25, toleranceDays: 2 });

    await world.expense(account, 200000, '2026-10-01', { description: 'Aluguel' });
    await world.expense(account, 148620, '2026-10-22', { description: 'Mercado' });
    // After today, ignored, not spending (an invoice payment) and outside the window: none counts.
    await world.expense(account, 9999, '2026-10-23', { description: 'Amanhã' });
    await world.expense(account, 5000, '2026-10-10', {
      description: 'Ignorado',
      overrides: { ignored_at: '2026-10-11T00:00:00.000Z' },
    });
    await world.invoicePaymentDebit(account, 77777, '2026-10-12');
    // September until the 22nd: R$ 3.172,00, and a purchase on the 23rd that is outside the window.
    await world.expense(account, 3172_00, '2026-09-22', { description: 'Setembro' });
    await world.expense(account, 4321, '2026-09-23', { description: 'Fora da janela' });
    await world.income(account, 100000, '2026-09-10', { description: 'Salário de setembro' });

    return account;
  }

  it('answers the example of the contract: received of expected, spent against September, the result', async () => {
    await seedIncomeAndSpending();

    const dto = await summary('2026-10');

    expect(dto).toMatchObject({
      month: '2026-10',
      isCurrentMonth: true,
      asOfOn: '2026-10-22',
      income: { receivedCents: 380200 + 0, expectedCents: 842700, receivedPct: 45.1 },
      expenses: {
        spentCents: 348620,
        previousSpentCents: 317200,
        changeCents: 31420,
        changePct: 9.9,
        comparedFromOn: '2026-10-01',
        comparedUntilOn: '2026-10-22',
        previousComparedUntilOn: '2026-09-22',
      },
      result: { cents: 380200 - 348620, previousCents: 100000 - 317200 },
    });
    expect(dto.result.cents).toBe(31580);
  });

  it('has "what is left" equal to the composition of the Livre in the current month, and null in another', async () => {
    await seedExampleOne(world);

    const current = await summary('2026-10');
    const free = await world.get('/dashboard/free-balance', freeBalanceDtoSchema);

    expect(current.remaining).toEqual({
      daysRemaining: free.daysRemaining,
      incomingCents: free.receivable.totalCents,
      outgoingCents: free.payable.totalCents,
    });
    expect(current.remaining).toEqual({
      daysRemaining: 10,
      incomingCents: 462500,
      outgoingCents: 232669,
    });
    expect((await summary('2026-09')).remaining).toBeNull();
    expect((await summary('2026-11')).remaining).toBeNull();
  });

  it('compares a past month as a whole and puts a future month at its first day', async () => {
    const account = await world.bankAccount('Conta', 0);
    await world.expense(account, 1000, '2026-02-10');
    await world.expense(account, 500, '2026-01-31');

    const past = await summary('2026-02');
    const future = await summary('2026-12');

    expect(past).toMatchObject({
      isCurrentMonth: false,
      asOfOn: '2026-02-28',
      expenses: {
        spentCents: 1000,
        previousSpentCents: 500,
        comparedUntilOn: '2026-02-28',
        previousComparedUntilOn: '2026-01-31',
      },
    });
    expect(future).toMatchObject({ isCurrentMonth: false, asOfOn: '2026-12-01', remaining: null });
  });

  it('has no percentage when the month before has no spending, and nothing at all in an empty database', async () => {
    const empty = await summary('2026-10');

    expect(empty).toMatchObject({
      income: { receivedCents: 0, expectedCents: 0, receivedPct: null },
      expenses: { spentCents: 0, previousSpentCents: 0, changeCents: 0, changePct: null },
      result: { cents: 0, previousCents: 0 },
      alerts: [],
    });
    const account = await world.bankAccount('Conta', 0);
    await world.expense(account, 1000, '2026-10-05');
    expect((await summary('2026-10')).expenses).toMatchObject({
      changeCents: 1000,
      changePct: null,
    });
  });

  it('counts a skipped occurrence out of what is expected, and an income that no occurrence took in as expected too', async () => {
    const account = await world.bankAccount('Conta', 0);
    const skipped = await world.recurrence({
      kind: 'income',
      name: 'Freela',
      expectedAmountCents: 50000,
      dateRule: { type: 'fixed_day', day: 25 },
      accountId: account,
      method: 'pix',
    });
    expect(
      (await world.send('POST', `/occurrences/${skipped.occurrence?.id}/skip`)).status,
    ).toBeLessThan(300);
    await world.income(account, 7000, '2026-10-12', { description: 'Pix avulso' });

    const dto = await summary('2026-10');

    expect(dto.income).toEqual({ receivedCents: 7000, expectedCents: 7000, receivedPct: 100 });
  });

  it('raises the alert of a late occurrence with the days late, and has none in a quiet month', async () => {
    const seeds = await seedExampleOne(world);

    const dto = await summary('2026-10');

    const late = dto.alerts.find((alert) => alert.recurrenceName === 'Diarista');
    expect(late).toMatchObject({
      type: 'late_occurrence',
      occurrenceId: seeds.diarista.occurrence?.id,
    });
    expect(late?.daysLate).toBeGreaterThan(0);
  });

  it('takes the day of São Paulo: 23:59 on the 31st is still October, 00:00 on the 1st is November', async () => {
    const account = await world.bankAccount('Conta', 0);
    await world.expense(account, 700, '2026-10-31');

    const beforeMidnight = await summary('2026-10', world.at('2026-11-01T02:59:00.000Z'));
    const afterMidnight = await summary('2026-10', world.at('2026-11-01T03:00:00.000Z'));

    expect(beforeMidnight).toMatchObject({ isCurrentMonth: true, asOfOn: '2026-10-31' });
    expect(beforeMidnight.expenses.spentCents).toBe(700);
    expect(afterMidnight).toMatchObject({ isCurrentMonth: false, asOfOn: '2026-10-31' });
  });

  it('answers 400 for a month that is missing or malformed, 401 without the token', async () => {
    await world.expectError(
      await world.send('GET', '/dashboard/month-summary'),
      400,
      'VALIDATION_FAILED',
    );
    await world.expectError(
      await world.send('GET', '/dashboard/month-summary?month=2026-13'),
      400,
      'VALIDATION_FAILED',
    );
    await world.expectError(
      await world.send('GET', '/dashboard/month-summary?month=1999-01'),
      400,
      'VALIDATION_FAILED',
    );
    const noToken = await world.send('GET', '/dashboard/month-summary?month=2026-10', undefined, {
      'x-fincheck-token': 'wrong',
    });
    await world.expectError(noToken, 401, 'LOCAL_TOKEN_INVALID');
  });
});
