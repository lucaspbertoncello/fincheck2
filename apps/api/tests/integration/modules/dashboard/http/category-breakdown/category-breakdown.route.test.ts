import { categoryBreakdownDtoSchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { categoryTrendDtoSchema } from '@fincheck/shared/dashboard/category-trend/category-trend.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

describe('GET /dashboard/categories and /dashboard/categories/:id/trend', () => {
  let world: DashboardTestWorld;
  let account: string;

  beforeEach(async () => {
    world = await createDashboardTestWorld();
    account = await world.bankAccount('Conta', 0);
  });

  afterEach(async () => {
    await world.destroy();
  });

  const breakdown = (query: string) =>
    world.get(`/dashboard/categories${query}`, categoryBreakdownDtoSchema);
  const trend = (id: string, query = '') =>
    world.get(`/dashboard/categories/${id}/trend${query}`, categoryTrendDtoSchema);

  async function seedSpending() {
    const food = await world.category('expense', 'Alimentação');
    const car = await world.category('expense', 'Carro');
    await world.expense(account, 5000, '2026-10-05', { categoryId: food, description: 'Mercado' });
    await world.expense(account, 3000, '2026-10-12', { categoryId: food, description: 'Padaria' });
    await world.expense(account, 9000, '2026-10-20', { categoryId: car, description: 'Gasolina' });
    await world.expense(account, 1100, '2026-10-21', { description: 'Sem rótulo' });
    // September until the 22nd.
    await world.expense(account, 4000, '2026-09-10', { categoryId: food });
    await world.expense(account, 3000, '2026-09-15', { categoryId: car });
    // Outside the window: after today, and the 23rd of September.
    await world.expense(account, 700, '2026-10-25', { categoryId: food });
    await world.expense(account, 600, '2026-09-23', { categoryId: food });

    return { food, car };
  }

  it('groups the spending of the month by category with the comparison, the share and "where it grew the most"', async () => {
    const { food, car } = await seedSpending();

    const dto = await breakdown('?month=2026-10');

    expect(dto.month).toBe('2026-10');
    expect(dto.comparedUntilOn).toBe('2026-10-22');
    expect(dto.expenses.totalCents).toBe(18100);
    expect(dto.expenses.previousTotalCents).toBe(7000);
    expect(dto.expenses.items.map((item) => [item.categoryId, item.spentCents])).toEqual([
      [car, 9000],
      [food, 8000],
      [null, 1100],
    ]);
    const carItem = dto.expenses.items[0];
    expect(carItem).toMatchObject({
      previousSpentCents: 3000,
      changeCents: 6000,
      changePct: 200,
      sharePct: 49.7,
      transactionCount: 1,
    });
    expect(dto.expenses.items[1]).toMatchObject({
      previousSpentCents: 4000,
      changeCents: 4000,
      changePct: 100,
      transactionCount: 2,
    });
    expect(dto.expenses.items[1]?.latest.map((entry) => entry.description)).toEqual([
      'Padaria',
      'Mercado',
    ]);
    // R$ 90,00 against R$ 30,00 before: the biggest rise in reais.
    expect(dto.expenses.topGrowth).toEqual({ categoryId: car, changePct: 200, changeCents: 6000 });
  });

  it('sums the categories to the total of the summary of the same month (BR-CAT-002: "Sem categoria" closes the total)', async () => {
    await seedSpending();

    const dto = await breakdown('?month=2026-10');
    const summary = await world.get(
      '/dashboard/month-summary?month=2026-10',
      monthSummaryDtoSchema,
    );

    expect(dto.expenses.items.reduce((total, item) => total + item.spentCents, 0)).toBe(
      dto.expenses.totalCents,
    );
    expect(dto.expenses.totalCents).toBe(summary.expenses.spentCents);
    expect(dto.expenses.previousTotalCents).toBe(summary.expenses.previousSpentCents);
  });

  it('counts a split transaction by its parts, each in its category and nature', async () => {
    const food = await world.category('expense', 'Alimentação');
    const gifts = await world.category('expense', 'Presentes');
    const id = await world.expense(account, 10000, '2026-10-10', {
      description: 'Mercado e presente',
    });
    const response = await world.send('PUT', `/transactions/${id}/splits`, {
      parts: [
        { amountCents: 6000, categoryId: food },
        { amountCents: 4000, categoryId: gifts },
      ],
    });
    expect(response.status).toBe(200);

    const dto = await breakdown('?month=2026-10');

    expect(dto.expenses.items.map((item) => [item.categoryId, item.spentCents]).toSorted()).toEqual(
      [
        [food, 6000],
        [gifts, 4000],
      ].toSorted(),
    );
    expect(dto.expenses.totalCents).toBe(10000);
  });

  it('has the income by source: received, expected and what is pending, and the same expected total as the summary', async () => {
    const mesadaCategory = await world.category('income', 'Mesada');
    const created = await world.recurrence({
      kind: 'income',
      name: 'Mesada',
      expectedAmountCents: 85000,
      dateRule: { type: 'any_day' },
      maxPayments: 2,
      accountId: account,
      method: 'pix',
      categoryId: mesadaCategory,
    });
    const pix = await world.income(account, 42500, '2026-10-03', { categoryId: mesadaCategory });
    expect(
      (
        await world.send('POST', `/occurrences/${created.occurrence?.id}/payments`, {
          transactionId: pix,
        })
      ).status,
    ).toBeLessThan(300);
    const extra = await world.income(account, 3000, '2026-10-10', { description: 'Pix avulso' });

    const dto = await breakdown('?month=2026-10');
    const summary = await world.get(
      '/dashboard/month-summary?month=2026-10',
      monthSummaryDtoSchema,
    );

    expect(dto.incomes.items).toEqual([
      {
        categoryId: mesadaCategory,
        receivedCents: 42500,
        expectedCents: 85000,
        transactionCount: 1,
        pending: [
          expect.objectContaining({
            recurrenceName: 'Mesada',
            remainingCents: 42500,
            status: 'partial',
          }),
        ],
      },
      {
        categoryId: null,
        receivedCents: 3000,
        expectedCents: 3000,
        transactionCount: 1,
        pending: [],
      },
    ]);
    expect(dto.incomes.receivedCents).toBe(45500);
    expect(dto.incomes.expectedCents).toBe(88000);
    expect(dto.incomes.expectedCents).toBe(summary.income.expectedCents);
    expect(dto.incomes.receivedCents).toBe(summary.income.receivedCents);
    expect(extra).toBeTruthy();
  });

  it('counts the transactions waiting for review of the month (the whole month), and the first month with a transaction', async () => {
    await world.expense(account, 1000, '2026-10-05');
    await world.expense(account, 2000, '2026-10-28');
    await world.expense(account, 4000, '2026-09-05');
    const dto = await breakdown('?month=2026-10');

    expect(dto.review).toEqual({ count: 2, totalCents: 3000 });
    expect(dto.firstMonth).toBe('2026-10');
  });

  it('compares a free period with the period of the same size right before, and has no "where it grew" without a month', async () => {
    const { food } = await seedSpending();

    const dto = await breakdown('?from=2026-10-01&to=2026-10-22');

    expect(dto.month).toBeNull();
    expect(dto.comparedUntilOn).toBe('2026-10-22');
    // The 22 days before: 09/09 to 30/09 (the purchases of the 10th and of the 15th of September).
    expect(dto.expenses.previousTotalCents).toBe(7000 + 600);
    expect(dto.expenses.items.find((item) => item.categoryId === food)?.previousSpentCents).toBe(
      4600,
    );
    expect(dto.incomes.expectedCents).toBe(0);
  });

  it('is all the history with nothing asked: no comparison, no "where it grew", null fields', async () => {
    await seedSpending();

    const dto = await breakdown('');

    expect(dto.month).toBeNull();
    expect(dto.comparedUntilOn).toBeNull();
    expect(dto.firstMonth).toBe('2026-09');
    expect(dto.expenses.previousTotalCents).toBeNull();
    expect(dto.expenses.topGrowth).toBeNull();
    expect(
      dto.expenses.items.every(
        (item) =>
          item.previousSpentCents === null && item.changeCents === null && item.changePct === null,
      ),
    ).toBe(true);
    expect(dto.expenses.totalCents).toBe(18100 + 7000 + 700 + 600);
  });

  it('answers 400 for a month with a period, one end only, a reversed period and a bad month; 401 without the token', async () => {
    for (const query of [
      '?month=2026-10&from=2026-10-01&to=2026-10-31',
      '?from=2026-10-01',
      '?from=2026-10-31&to=2026-10-01',
      '?month=2026-13',
      '?from=2026-02-30&to=2026-03-01',
    ]) {
      await world.expectError(
        await world.send('GET', `/dashboard/categories${query}`),
        400,
        'VALIDATION_FAILED',
      );
    }
    await world.expectError(
      await world.send('GET', '/dashboard/categories?month=2026-10', undefined, {
        'x-fincheck-token': 'x',
      }),
      401,
      'LOCAL_TOKEN_INVALID',
    );
  });

  describe('trend', () => {
    it('has the 12 months of an expense category up to the current month, oldest first, with 0 where nothing happened', async () => {
      const { food } = await seedSpending();

      const dto = await trend(food);

      expect(dto.kind).toBe('expense');
      expect(dto.categoryId).toBe(food);
      expect(dto.months).toHaveLength(12);
      expect(dto.months[0]?.month).toBe('2025-11');
      expect(dto.months[11]).toEqual({ month: '2026-10', totalCents: 8700, transactionCount: 3 });
      expect(dto.months[10]).toEqual({ month: '2026-09', totalCents: 4600, transactionCount: 2 });
      expect(dto.months[5]).toEqual({ month: '2026-04', totalCents: 0, transactionCount: 0 });
    });

    it('follows `until` and has the received of an income category', async () => {
      const salary = await world.category('income', 'Renda de teste');
      await world.income(account, 420000, '2026-03-05', { categoryId: salary });

      const dto = await trend(salary, '?until=2026-04');

      expect(dto.kind).toBe('income');
      expect(dto.months.at(-1)).toEqual({ month: '2026-04', totalCents: 0, transactionCount: 0 });
      expect(dto.months.at(-2)).toEqual({
        month: '2026-03',
        totalCents: 420000,
        transactionCount: 1,
      });
    });

    it('sums by competence: a split transaction by its parts, an ignored one not at all', async () => {
      const food = await world.category('expense', 'Alimentação');
      const gifts = await world.category('expense', 'Presentes');
      const id = await world.expense(account, 10000, '2026-10-10');
      await world.send('PUT', `/transactions/${id}/splits`, {
        parts: [
          { amountCents: 6000, categoryId: food },
          { amountCents: 4000, categoryId: gifts },
        ],
      });
      await world.expense(account, 999, '2026-10-11', {
        categoryId: food,
        overrides: { ignored_at: '2026-10-12T00:00:00.000Z' },
      });
      await insertTestTransaction(world.db, account, {
        description: 'Presente',
        amount_cents: -100,
        occurred_on: '2026-10-13',
        category_id: gifts,
      });

      expect((await trend(food)).months[11]).toMatchObject({
        totalCents: 6000,
        transactionCount: 1,
      });
      expect((await trend(gifts)).months[11]).toMatchObject({
        totalCents: 4100,
        transactionCount: 2,
      });
    });

    it('answers 404 CATEGORY_NOT_FOUND, 400 for a bad id or month, 401 without the token', async () => {
      await world.expectError(
        await world.send('GET', `/dashboard/categories/${generateId()}/trend`),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await world.expectError(
        await world.send('GET', '/dashboard/categories/abc/trend'),
        400,
        'VALIDATION_FAILED',
      );
      const category = await world.category();
      await world.expectError(
        await world.send('GET', `/dashboard/categories/${category}/trend?until=2026-13`),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await world.send('GET', `/dashboard/categories/${category}/trend`, undefined, {
          'x-fincheck-token': 'x',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });
});
