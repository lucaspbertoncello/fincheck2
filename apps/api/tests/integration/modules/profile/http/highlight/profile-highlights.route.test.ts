import { profileHighlightsDtoSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

// 08/11/2026 12:00 in São Paulo: the window of the 12 months is 01/12/2025 to 08/11/2026.
const NOW = '2026-11-08T15:00:00.000Z';

describe('GET /profile/highlights', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld(NOW);
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const db = () => world.database.db;

  const getHighlights = async () => {
    const response = await world.send('GET', '/profile/highlights');
    expect(response.status).toBe(200);

    return profileHighlightsDtoSchema.parse(await response.json());
  };

  // A debit by `debit`, so it is spending and not a Pix.
  const spend = (
    cents: number,
    on: string,
    overrides: NonNullable<Parameters<typeof insertTestExpense>[2]['overrides']> = {},
  ) =>
    insertTestExpense(db(), world.checking, {
      cents,
      on,
      overrides: { method: 'debit', ...overrides },
    });

  it('needs the local token', async () => {
    await world.expectError(
      await world.send('GET', '/profile/highlights', undefined, { [LOCAL_TOKEN_HEADER]: 'wrong' }),
      401,
      'LOCAL_TOKEN_INVALID',
    );
  });

  it('answers the six curiosities as null without any data', async () => {
    expect(await getHighlights()).toEqual({
      largestPixSent: null,
      largestPixReceived: null,
      topCategory: null,
      costliestMonth: null,
      costliestWeekday: null,
      longestNoSpendStreak: null,
    });
  });

  describe('the biggest Pix (whole history)', () => {
    it('finds the biggest sent and received, even out of the 12 months', async () => {
      const smallSent = await insertTestExpense(db(), world.checking, {
        cents: 12000,
        on: '2026-08-01',
        overrides: { bank_counterparty: 'MARIA SILVA' },
      });
      const bigSent = await insertTestExpense(db(), world.checking, {
        cents: 50000,
        on: '2024-01-10',
        overrides: { bank_counterparty: 'JOAO PEREIRA' },
      });
      const received = await insertTestIncome(db(), world.checking, {
        cents: 30000,
        on: '2026-10-05',
        counterparty: 'ALVORADA SISTEMAS',
      });

      const highlights = await getHighlights();

      expect(highlights.largestPixSent).toEqual({
        transactionId: bigSent,
        amountCents: 50000,
        counterparty: 'JOAO PEREIRA',
        occurredOn: '2024-01-10',
      });
      expect(highlights.largestPixSent?.transactionId).not.toBe(smallSent);
      expect(highlights.largestPixReceived).toEqual({
        transactionId: received,
        amountCents: 30000,
        counterparty: 'ALVORADA SISTEMAS',
        occurredOn: '2026-10-05',
      });
    });

    it('has a null counterparty when the bank did not say who', async () => {
      await insertTestExpense(db(), world.checking, { cents: 1000, on: '2026-10-01' });
      await insertTestIncome(db(), world.checking, {
        cents: 2000,
        on: '2026-10-02',
        counterparty: '   ',
      });

      const highlights = await getHighlights();

      expect(highlights.largestPixSent?.counterparty).toBeNull();
      expect(highlights.largestPixReceived?.counterparty).toBeNull();
    });

    it('leaves out what is not a Pix of his, ignored, removed by the bank, a transfer or an invoice payment', async () => {
      const counted = await insertTestExpense(db(), world.checking, {
        cents: 1000,
        on: '2026-10-01',
      });
      await insertTestExpense(db(), world.checking, {
        cents: 90000,
        on: '2026-10-02',
        overrides: { ignored_at: '2026-10-03T10:00:00.000Z' },
      });
      await insertTestExpense(db(), world.checking, {
        cents: 95000,
        on: '2026-10-02',
        overrides: { bank_removed_at: '2026-10-03T10:00:00.000Z' },
      });
      await insertTestExpense(db(), world.checking, {
        cents: 80000,
        on: '2026-10-02',
        overrides: { nature: 'transfer' },
      });
      await insertTestExpense(db(), world.checking, {
        cents: 60000,
        on: '2026-10-02',
        overrides: { nature: 'invoice_payment' },
      });
      await insertTestExpense(db(), world.checking, {
        cents: 70000,
        on: '2026-10-02',
        overrides: { method: 'debit' },
      });
      await insertTestIncome(db(), world.checking, {
        cents: 200000,
        on: '2026-10-02',
        overrides: { method: 'boleto' },
      });

      const highlights = await getHighlights();

      expect(highlights.largestPixSent?.transactionId).toBe(counted);
      expect(highlights.largestPixReceived).toBeNull();
    });

    it('breaks a tie by the most recent day', async () => {
      await insertTestExpense(db(), world.checking, { cents: 5000, on: '2026-05-01' });
      const recent = await insertTestExpense(db(), world.checking, {
        cents: 5000,
        on: '2026-09-01',
      });

      expect((await getHighlights()).largestPixSent?.transactionId).toBe(recent);
    });
  });

  describe('the spending of the last 12 months (by competence)', () => {
    it('finds the top category, the costliest month, the costliest weekday and the longest streak', async () => {
      const food = await insertTestCategory(db(), { name: 'Mercado do bairro' });
      const transport = await insertTestCategory(db(), { name: 'Corridas de app' });

      // Mondays: 05/10, 12/10 and 14/09. Tuesday: 20/10, with no category.
      await spend(30000, '2026-10-05', { category_id: food });
      await spend(20000, '2026-10-12', { category_id: food });
      await spend(25000, '2026-09-14', { category_id: transport });
      await spend(5000, '2026-10-20');

      // None of these is spending in the window.
      await spend(99999, '2026-10-06', { ignored_at: '2026-10-07T10:00:00.000Z' });
      await spend(88888, '2026-10-06', { nature: 'transfer' });
      await spend(77777, '2026-10-06', { nature: 'invoice_payment' });
      await spend(66666, '2026-10-06', { nature: 'lent' });
      await insertTestIncome(db(), world.checking, { cents: 500000, on: '2026-10-06' });

      const highlights = await getHighlights();

      // 50000 of 80000.
      expect(highlights.topCategory).toEqual({
        categoryId: food,
        totalCents: 50000,
        sharePercent: 62.5,
      });
      expect(highlights.costliestMonth).toEqual({ month: '2026-10', totalCents: 55000 });
      // 75000 over the 49 Mondays of the 343 days of the window.
      expect(highlights.costliestWeekday).toEqual({ weekday: 1, averageCents: 1531 });
      // After 14/09 the longest gap is 15/09 to 04/10; the last one, 21/10 to 08/11, has 19 days.
      expect(highlights.longestNoSpendStreak).toEqual({
        days: 20,
        from: '2026-09-15',
        to: '2026-10-04',
      });
    });

    it('takes the window from the first day of the month 11 months back to today', async () => {
      await spend(1000, '2025-11-30');
      await spend(2000, '2025-12-01');
      await spend(4000, '2026-11-08');
      await spend(8000, '2026-11-09');

      const highlights = await getHighlights();

      // 30/11/2025 and tomorrow are out; the first day and today are in.
      expect(highlights.costliestMonth).toEqual({ month: '2026-11', totalCents: 4000 });
      expect(highlights.longestNoSpendStreak).toEqual({
        days: 341,
        from: '2025-12-02',
        to: '2026-11-07',
      });
    });

    it('counts a split transaction by its expense parts, each on its own category', async () => {
      const food = await insertTestCategory(db(), { name: 'Mercado do bairro' });
      const gifts = await insertTestCategory(db(), { name: 'Lembrancinhas' });
      const split = await spend(10000, '2026-10-10', { category_id: food });
      await db()
        .insertInto('transaction_splits')
        .values([
          {
            id: generateId(),
            transaction_id: split,
            position: 0,
            amount_cents: -5000,
            nature: 'expense',
            category_id: food,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: split,
            position: 1,
            amount_cents: -3000,
            nature: 'expense',
            category_id: gifts,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: split,
            position: 2,
            amount_cents: -2000,
            nature: 'lent',
            category_id: null,
            description: 'Rafael',
          },
        ])
        .execute();

      const highlights = await getHighlights();

      // The 2000 lent is not spending: 5000 + 3000 = 8000, and food has 5000 of it.
      expect(highlights.costliestMonth).toEqual({ month: '2026-10', totalCents: 8000 });
      expect(highlights.topCategory).toEqual({
        categoryId: food,
        totalCents: 5000,
        sharePercent: 62.5,
      });
    });

    it('counts an installment on the day of the purchase, in the month of its invoice, and not before it came', async () => {
      const plan = await insertTestInstallmentPlan(db(), world.checking, {
        purchase_on: '2026-08-15',
        total_cents: 30000,
        installment_count: 4,
        first_invoice_month: '2026-09',
      });
      for (const [number, month] of [
        [1, '2026-09'],
        [2, '2026-10'],
        [3, '2026-11'],
        [4, '2026-12'],
      ] as const) {
        await spend(7500, '2026-08-15', {
          installment_plan_id: plan,
          installment_number: number,
          invoice_month: month,
        });
      }
      // The 4th parcel falls on 15/12, which has not come: it is not spending yet. The 3rd, on
      // 15/11, has not come either (today is 08/11).
      const highlights = await getHighlights();

      expect(highlights.costliestMonth).toEqual({ month: '2026-10', totalCents: 7500 });
      expect(highlights.longestNoSpendStreak).toEqual({
        days: 29,
        from: '2026-09-16',
        to: '2026-10-14',
      });
    });
  });
});
