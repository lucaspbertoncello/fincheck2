import { spendHeatmapDtoSchema } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';
import { spendingCurveDtoSchema } from '@fincheck/shared/dashboard/spending-curve/spending-curve.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';
import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';

describe('the spending of the month: GET /dashboard/spending-curve and /dashboard/spend-heatmap', () => {
  let world: DashboardTestWorld;
  let account: string;

  beforeEach(async () => {
    world = await createDashboardTestWorld();
    account = await world.bankAccount('Conta', 0);
  });

  afterEach(async () => {
    await world.destroy();
  });

  const curve = (month: string) =>
    world.get(`/dashboard/spending-curve?month=${month}`, spendingCurveDtoSchema);
  const heatmap = (query = '') =>
    world.get(`/dashboard/spend-heatmap${query}`, spendHeatmapDtoSchema);

  describe('spending-curve', () => {
    it('accumulates the spending of the month against the month before, nothing after today', async () => {
      await world.expense(account, 1000, '2026-10-01');
      await world.expense(account, 500, '2026-10-01');
      await world.expense(account, 2500, '2026-10-20');
      await world.expense(account, 900, '2026-09-02');

      const dto = await curve('2026-10');

      expect(dto.previousMonth).toBe('2026-09');
      expect(dto.days).toHaveLength(31);
      expect(dto.days[0]).toEqual({ day: 1, currentCents: 1500, previousCents: 0 });
      expect(dto.days[1]).toEqual({ day: 2, currentCents: 1500, previousCents: 900 });
      expect(dto.days[19]).toMatchObject({ day: 20, currentCents: 4000 });
      expect(dto.days[21]).toMatchObject({ day: 22, currentCents: 4000 });
      expect(dto.days[22]).toMatchObject({ day: 23, currentCents: null });
      // 31 against a September of 30 days.
      expect(dto.days[30]).toMatchObject({ day: 31, previousCents: null });
    });

    it('counts a parcel on the day of the purchase in the month of its invoice (competence), not on the day of the bank', async () => {
      const card = await world.card('Nubank', 30, 6);
      const plan = await insertTestInstallmentPlan(world.db, card, {
        purchase_on: '2026-08-10',
        total_cents: 320000,
        installment_count: 10,
        first_invoice_month: '2026-08',
      });
      await insertTestTransaction(world.db, card, {
        origin: 'bank',
        method: 'credit',
        nature: 'expense',
        description: 'Cadeira 03/10',
        amount_cents: -32000,
        occurred_on: '2026-08-10',
        invoice_month: '2026-10',
        installment_plan_id: plan,
        installment_number: 3,
      });

      const october = await curve('2026-10');
      const august = await curve('2026-08');

      expect(october.days[8]?.currentCents).toBe(0);
      expect(october.days[9]?.currentCents).toBe(32000);
      expect(august.days.at(-1)?.currentCents).toBe(0);
    });

    it('does not count what is ignored, a transfer, an income or what was lent; a refund lowers it', async () => {
      await world.expense(account, 1000, '2026-10-05');
      await world.expense(account, 700, '2026-10-05', {
        overrides: { ignored_at: '2026-10-06T00:00:00.000Z' },
      });
      await world.income(account, 9000, '2026-10-05');
      await world.invoicePaymentDebit(account, 4000, '2026-10-05');
      await insertTestTransaction(world.db, account, {
        nature: 'lent',
        description: 'Emprestei',
        amount_cents: -3000,
        occurred_on: '2026-10-05',
      });
      await insertTestTransaction(world.db, account, {
        nature: 'expense',
        description: 'Estorno',
        amount_cents: 250,
        occurred_on: '2026-10-06',
        method: 'other',
      });

      const dto = await curve('2026-10');

      expect(dto.days[4]?.currentCents).toBe(1000);
      expect(dto.days[5]?.currentCents).toBe(750);
    });

    it('shows a whole past month and nothing of a future one', async () => {
      await world.expense(account, 300, '2026-09-30');

      const past = await curve('2026-09');
      const future = await curve('2026-12');

      expect(past.days.at(-1)).toMatchObject({ day: 30, currentCents: 300 });
      expect(past.days).toHaveLength(30);
      expect(future.days.every((day) => day.currentCents === null)).toBe(true);
    });

    it('answers 400 for a bad month and 401 without the token', async () => {
      await world.expectError(
        await world.send('GET', '/dashboard/spending-curve'),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await world.send('GET', '/dashboard/spending-curve?month=2026-1'),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await world.send('GET', '/dashboard/spending-curve?month=2026-10', undefined, {
          'x-fincheck-token': 'x',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('spend-heatmap', () => {
    it('has 12 whole calendar months up to today, one item per day with no gaps', async () => {
      const dto = await heatmap();

      expect(dto.fromOn).toBe('2025-11-01');
      expect(dto.untilOn).toBe('2026-10-22');
      expect(dto.days).toHaveLength(356);
      expect(dto.days[0]?.date).toBe('2025-11-01');
      expect(dto.days.at(-1)?.date).toBe('2026-10-22');
      expect(dto).toMatchObject({ totalCents: 0, spendingDays: 0, peak: null, levels: [] });
    });

    it('sums the spending of the day by competence, with levels by quantiles and the peak', async () => {
      for (const [index, cents] of [1000, 2000, 3000, 4000, 100000].entries()) {
        await world.expense(account, cents, `2026-10-0${index + 1}`);
      }
      await world.expense(account, 500, '2026-10-01');

      const dto = await heatmap();

      const first = dto.days.find((day) => day.date === '2026-10-01');
      expect(first?.totalCents).toBe(1500);
      expect(dto.peak).toEqual({ date: '2026-10-05', totalCents: 100000 });
      expect(dto.spendingDays).toBe(5);
      expect(dto.totalCents).toBe(110500);
      expect(dto.days.find((day) => day.date === '2026-10-05')?.level).toBe(4);
      expect(dto.levels).toHaveLength(4);
    });

    it('is `from` to `to` when they come (a month or a year), and `until` moves the window', async () => {
      await world.expense(account, 700, '2026-02-10');

      const february = await heatmap('?from=2026-02-01&to=2026-02-28');
      const until = await heatmap('?until=2026-03-15');

      expect(february.days).toHaveLength(28);
      expect(february.totalCents).toBe(700);
      expect([until.fromOn, until.untilOn]).toEqual(['2025-04-01', '2026-03-15']);
      expect((await heatmap('?from=2028-01-01&to=2028-12-31')).days).toHaveLength(366);
    });

    it('answers 400 for a date that does not exist, from without to, both forms together and a range over 366 days', async () => {
      for (const query of [
        '?until=2026-02-30',
        '?from=2026-02-01',
        '?until=2026-02-01&from=2026-01-01&to=2026-01-31',
        '?from=2026-03-01&to=2026-02-01',
        '?from=2026-01-01&to=2027-01-02',
        '?until=1999-12-31',
      ]) {
        await world.expectError(
          await world.send('GET', `/dashboard/spend-heatmap${query}`),
          400,
          'VALIDATION_FAILED',
        );
      }
    });

    it('answers 401 without the token', async () => {
      await world.expectError(
        await world.send('GET', '/dashboard/spend-heatmap', undefined, { 'x-fincheck-token': 'x' }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });
});
