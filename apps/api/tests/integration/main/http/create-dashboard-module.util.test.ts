import { agendaDtoSchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { categoryBreakdownDtoSchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { categoryTrendDtoSchema } from '@fincheck/shared/dashboard/category-trend/category-trend.schema.ts';
import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';

// The app `main` builds (`createApp`), not a module on its own: each test needs one port of
// `dashboard` that `createApp` has to plug in, and fails if it is left out. The ports: the use case
// that creates the occurrences, `accounts`, `invoices`, `bills`, `recurrences` (the occurrences),
// `transactions` (the lines, and the queue to review) and `categories`. The connections of `sync`
// are the one port that is not wired yet (sync does not exist), so there is no test for it here: it
// is tested on the queries, and the day `sync` plugs it in, a test goes here.
describe('createApp wires dashboard into accounts, invoices, bills, recurrences, transactions and categories', () => {
  let world: DashboardTestWorld;

  beforeEach(async () => {
    world = await createDashboardTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const free = () => world.get('/dashboard/free-balance', freeBalanceDtoSchema);

  it('mounts every route: they answer and are not 404', async () => {
    const category = await world.category();
    for (const path of [
      '/dashboard/free-balance',
      '/dashboard/month-summary?month=2026-10',
      '/dashboard/spending-curve?month=2026-10',
      '/dashboard/spend-heatmap',
      '/dashboard/categories?month=2026-10',
      `/dashboard/categories/${category}/trend`,
      '/dashboard/timeline?month=2026-10',
      '/agenda?month=2026-10',
    ]) {
      expect((await world.send('GET', path)).status, path).toBe(200);
    }
  });

  it('creates the occurrences that are missing before it reads (the use case of recurrences)', async () => {
    const account = await world.bankAccount('Conta', 0);
    // Born in May for October: the occurrence of October does not exist until something asks for it.
    await world.recurrence(
      {
        kind: 'income',
        name: 'Salário',
        expectedAmountCents: 500000,
        dateRule: { type: 'fixed_day', day: 28 },
        startsMonth: '2026-10',
        accountId: account,
        method: 'pix',
      },
      world.at('2026-05-22T15:00:00.000Z'),
    );
    expect(
      await world.db
        .selectFrom('recurrence_occurrences')
        .select('month')
        .where('month', '=', '2026-10')
        .execute(),
    ).toEqual([]);

    expect((await free()).receivable.items.map((item) => item.title)).toEqual(['Salário']);
    expect((await world.send('GET', '/agenda?month=2026-10')).status).toBe(200);
    expect(
      await world.db
        .selectFrom('recurrence_occurrences')
        .select('month')
        .where('month', '=', '2026-10')
        .execute(),
    ).toHaveLength(1);
  });

  it('creates them before every read that depends on them: the summary, the categories, the timeline and the agenda', async () => {
    const account = await world.bankAccount('Conta', 0);
    await world.recurrence(
      {
        kind: 'income',
        name: 'Salário',
        expectedAmountCents: 500000,
        dateRule: { type: 'fixed_day', day: 28 },
        startsMonth: '2026-10',
        accountId: account,
        method: 'pix',
      },
      world.at('2026-05-22T15:00:00.000Z'),
    );
    const octoberRows = () =>
      world.db
        .selectFrom('recurrence_occurrences')
        .select('id')
        .where('month', '=', '2026-10')
        .execute();
    const forget = () =>
      world.db.deleteFrom('recurrence_occurrences').where('month', '=', '2026-10').execute();

    expect(await octoberRows()).toEqual([]);
    expect(
      (await world.get('/dashboard/month-summary?month=2026-10', monthSummaryDtoSchema)).income
        .expectedCents,
    ).toBe(500000);
    await forget();
    expect(
      (await world.get('/dashboard/categories?month=2026-10', categoryBreakdownDtoSchema)).incomes
        .expectedCents,
    ).toBe(500000);
    await forget();
    expect(
      (await world.get('/dashboard/timeline?month=2026-10', timelineDtoSchema)).undated.concat(
        (await world.get('/dashboard/timeline?month=2026-10', timelineDtoSchema)).days.flatMap(
          (day) => day.items,
        ),
      ),
    ).toHaveLength(1);
    await forget();
    expect((await world.get('/agenda?month=2026-10', agendaDtoSchema)).month).toBe('2026-10');
    expect(await octoberRows()).toHaveLength(1);
  });

  it('reads the balances of the accounts, the manual ones included (accounts)', async () => {
    await world.bankAccount('Banco', 123456);
    const wallet = await world.manualAccount('Carteira', {
      type: 'wallet',
      institution_code: 'wallet',
    });
    await world.income(wallet, 5000, '2026-10-01', { description: 'Dinheiro' });

    const dto = await free();

    expect(dto.accounts.totalCents).toBe(128456);
    expect(dto.accounts.items.map((item) => item.name).toSorted()).toEqual(['Banco', 'Carteira']);
  });

  it('reads the invoices that are not paid (invoices): the open one and the closed one', async () => {
    const card = await world.card('Nubank', 30, 6);
    await world.purchase(card, 40000, '2026-10-10', '2026-10');

    const dto = await free();

    expect(dto.payable.items.map((item) => [item.title, item.remainingCents])).toEqual([
      ['Fatura Nubank', 40000],
    ]);
    expect((await world.get('/agenda?month=2026-10', agendaDtoSchema)).openInvoices).toHaveLength(
      1,
    );
  });

  it('reads the bills and the presumed payment (bills)', async () => {
    const account = await world.bankAccount('Conta', 0);
    await world.bill({ description: 'Condomínio', amountCents: 25000, dueOn: '2026-10-28' });
    expect((await free()).payable.totalCents).toBe(25000);
    await world.expense(account, 25000, '2026-10-22');

    expect((await free()).payable.totalCents).toBe(0);
  });

  it('reads the occurrences of the recurrences (recurrences)', async () => {
    await world.recurrence({
      name: 'Academia',
      expectedAmountCents: 10990,
      dateRule: { type: 'fixed_day', day: 25 },
    });

    expect((await free()).payable.items.map((item) => [item.title, item.remainingCents])).toEqual([
      ['Academia', 10990],
    ]);
  });

  it('reads the lines of spending and income and the queue to review (transactions)', async () => {
    const account = await world.bankAccount('Conta', 0);
    await world.expense(account, 1500, '2026-10-05');
    await world.income(account, 9000, '2026-10-06');

    const summary = await world.get(
      '/dashboard/month-summary?month=2026-10',
      monthSummaryDtoSchema,
    );
    const dto = await free();

    expect(summary.expenses.spentCents).toBe(1500);
    expect(summary.income.receivedCents).toBe(9000);
    expect(dto.review).toEqual({ count: 2, byAccount: [{ accountId: account, count: 2 }] });
    expect(
      (await world.get('/dashboard/categories?month=2026-10', categoryBreakdownDtoSchema)).review
        .count,
    ).toBe(2);
  });

  it('reads the category of the trend (categories): it exists, or it is a 404', async () => {
    const category = await world.category('income', 'Renda de teste');

    const dto = await world.get(`/dashboard/categories/${category}/trend`, categoryTrendDtoSchema);

    expect(dto).toMatchObject({ categoryId: category, kind: 'income' });
  });

  it('has no connection to show while sync is not wired: the freshness is empty and there are no connection alerts', async () => {
    expect((await free()).dataFreshness).toEqual([]);
    expect(
      (await world.get('/dashboard/month-summary?month=2026-10', monthSummaryDtoSchema)).alerts,
    ).toEqual([]);
  });
});
