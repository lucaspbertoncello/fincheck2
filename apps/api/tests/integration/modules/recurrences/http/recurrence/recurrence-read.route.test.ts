import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import {
  previewRecurrenceResponseSchema,
  recurrenceDetailDtoSchema,
  recurrenceListItemSchema,
  recurrenceSummarySchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

const MISSING = '01939000-0000-7000-8000-00000000dead';

describe('recurrence reads', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const listOf = async (month: string, extra = '') => {
    const response = await world.send('GET', `/recurrences?month=${month}${extra}`);
    expect(response.status).toBe(200);

    return listResponseSchema(recurrenceListItemSchema).parse(await response.json()).items;
  };

  describe('GET /recurrences', () => {
    it('lists the incomes first, then by expected day (no day last), then by name without accent or case', async () => {
      await world.create({ name: 'Água', dateRule: { type: 'fixed_day', day: 20 } });
      await world.create({ name: 'Aluguel', dateRule: { type: 'fixed_day', day: 5 } });
      await world.create({ name: 'Zeca', dateRule: { type: 'fixed_day', day: 20 } });
      await world.create({ name: 'Sem dia', dateRule: { type: 'any_day' } });
      await world.create({
        kind: 'income',
        name: 'Mesada',
        dateRule: { type: 'any_day' },
      });
      await world.create({
        kind: 'income',
        name: 'Salário',
        dateRule: { type: 'fixed_day', day: 15 },
      });

      const items = await listOf('2026-10');

      expect(items.map((item) => item.name)).toEqual([
        'Salário',
        'Mesada',
        'Aluguel',
        'Água',
        'Zeca',
        'Sem dia',
      ]);
    });

    it('brings the occurrence of the month asked in each line, null in a month with none', async () => {
      await world.create({ name: 'Academia', startsMonth: '2026-11' });

      const october = await listOf('2026-10');
      const november = await listOf('2026-11');

      expect(october).toHaveLength(1);
      expect(october[0]?.occurrence).toBeNull();
      expect(november[0]?.occurrence).toMatchObject({
        month: '2026-11',
        recurrenceName: 'Academia',
      });
    });

    it('does not list a deleted recurrence unless asked, and then shows only the occurrence that is history', async () => {
      const { recurrence, occurrence } = await world.create();
      const paid = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: paid });
      await world.send('DELETE', `/recurrences/${recurrence.id}`);

      expect(await listOf('2026-10')).toEqual([]);

      const archived = await listOf('2026-10', '&includeArchived=true');
      expect(archived).toHaveLength(1);
      expect(archived[0]).toMatchObject({ id: recurrence.id });
      expect(archived[0]?.archivedAt).not.toBeNull();
      expect(archived[0]?.occurrence).toMatchObject({ status: 'confirmed' });
      // November has no occurrence any more: the untouched ones went with the deletion.
      expect((await listOf('2026-11', '&includeArchived=true'))[0]?.occurrence).toBeNull();
    });

    it('creates the occurrences that are missing before it answers, and never twice', async () => {
      await world.database.db
        .insertInto('recurrences')
        .values({
          id: MISSING,
          kind: 'expense',
          name: 'Veio de fora',
          expected_amount_cents: 5000,
          amount_mode: 'fixed',
          counterparty: null,
          match_text: null,
          account_id: null,
          method: null,
          category_id: null,
          date_rule: 'any_day',
          day: null,
          business_day_number: null,
          tolerance_days: null,
          non_business_day_shift: null,
          employment_regime: null,
          is_subscription: 0,
          service_slug: null,
          max_payments: 1,
          starts_month: '2026-10',
          paused_at: null,
          archived_at: null,
          created_at: '2026-10-01T12:00:00.000Z',
          updated_at: '2026-10-01T12:00:00.000Z',
        })
        .execute();

      expect((await listOf('2026-10'))[0]?.occurrence).toMatchObject({ month: '2026-10' });
      await listOf('2026-10');
      await listOf('2026-12');

      const rows = await world.database.db
        .selectFrom('recurrence_occurrences')
        .select('month')
        .where('recurrence_id', '=', MISSING)
        .orderBy('month')
        .execute();
      expect(rows.map((row) => row.month)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01']);
    });

    it('does not create occurrences for a paused or a deleted recurrence', async () => {
      const paused = await world.create({ name: 'Pausada' });
      await world.send('POST', `/recurrences/${paused.recurrence.id}/pause`);

      // The month turns: the paused one gets nothing new.
      const november = world.at('2026-11-02T15:00:00.000Z');
      const response = await november('GET', '/recurrences?month=2027-02');

      const items = listResponseSchema(recurrenceListItemSchema).parse(await response.json()).items;
      expect(items[0]?.occurrence).toBeNull();
    });

    it('answers 400 without the month, with a malformed month and with a year out of range', async () => {
      for (const path of [
        '/recurrences',
        '/recurrences?month=2026-13',
        '/recurrences?month=2026-1',
        '/recurrences?month=1999-12',
        '/recurrences?month=2101-01',
        '/recurrences?month=2026-10&includeArchived=maybe',
      ]) {
        await world.expectError(await world.send('GET', path), 400, 'VALIDATION_FAILED');
      }
    });

    it('answers 401 without the local token', async () => {
      const response = await world.send('GET', '/recurrences?month=2026-10', undefined, {
        [LOCAL_TOKEN_HEADER]: 'wrong',
      });

      await world.expectError(response, 401, 'LOCAL_TOKEN_INVALID');
    });
  });

  describe('GET /recurrences/summary (the renda of October, from the contract)', () => {
    // 22/10/2026. Incomes: the 5th business day R$ 1.200,00 and the 15th R$ 1.400,00 (both received),
    // the freelance R$ 4.200,00 (window up to the 27th), the allowance R$ 850,00 (R$ 425,00 came)
    // and the voucher R$ 777,00 (received). Expenses: R$ 542,59 in 3 recurrences, 1 paid with a
    // different value, 1 late, 1 still expected.
    const payIncome = async (occurrenceId: string, cents: number, on: string) => {
      const transactionId = await insertTestIncome(world.database.db, world.checking, {
        cents,
        on,
      });
      const response = await world.send('POST', `/occurrences/${occurrenceId}/payments`, {
        transactionId,
      });
      expect(response.status).toBe(201);
    };

    it('adds up the incomes and the expenses of the month, as the screen shows them', async () => {
      const salary = await world.create({
        kind: 'income',
        name: 'Salário Treetools',
        expectedAmountCents: 120000,
        dateRule: { type: 'business_day', businessDayNumber: 5 },
      });
      const salaryMid = await world.create({
        kind: 'income',
        name: 'Salário Treetools, dia 15',
        expectedAmountCents: 140000,
        dateRule: { type: 'fixed_day', day: 15 },
      });
      await world.create({
        kind: 'income',
        name: 'Maxxy',
        expectedAmountCents: 420000,
        dateRule: { type: 'around_day', day: 25, toleranceDays: 2 },
      });
      const allowance = await world.create({
        kind: 'income',
        name: 'Mesada',
        expectedAmountCents: 85000,
        maxPayments: 2,
        dateRule: { type: 'any_day' },
      });
      const voucher = await world.create({
        kind: 'income',
        name: 'VR',
        expectedAmountCents: 77700,
        dateRule: { type: 'any_day', day: 5 },
      });
      await payIncome(salary.occurrence?.id ?? '', 120000, '2026-10-06');
      await payIncome(salaryMid.occurrence?.id ?? '', 140000, '2026-10-15');
      await payIncome(allowance.occurrence?.id ?? '', 42500, '2026-10-03');
      await payIncome(voucher.occurrence?.id ?? '', 77700, '2026-10-02');

      const plan = await world.create({
        name: 'Plano de saúde',
        expectedAmountCents: 21900,
        dateRule: { type: 'fixed_day', day: 20 },
      });
      await world.create({
        name: 'Diarista',
        expectedAmountCents: 21369,
        dateRule: { type: 'fixed_day', day: 5 },
      });
      await world.create({
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 25 },
      });
      const planPayment = await insertTestExpense(world.database.db, world.checking, {
        cents: 20000,
        on: '2026-10-20',
      });
      await world.send('POST', `/occurrences/${plan.occurrence?.id}/payments`, {
        transactionId: planPayment,
      });

      const response = await world.send('GET', '/recurrences/summary?month=2026-10');

      expect(response.status).toBe(200);
      expect(recurrenceSummarySchema.parse(await response.json())).toEqual({
        // Missing: the freelance (4.200,00 pending) and the allowance (R$ 425,00 partial). The
        // voucher and both salaries are confirmed, so nothing is left of them.
        incomes: { expectedCents: 842700, receivedCents: 380200, missingCents: 462500, count: 5 },
        expenses: {
          expectedCents: 54259,
          // Only the plan was paid (R$ 200,00, a different value). Missing: the late cleaner
          // (R$ 213,69) and the gym still expected (R$ 109,90); the confirmed plan has none.
          paidCents: 20000,
          missingCents: 32359,
          paidCount: 1,
          lateCount: 1,
          differentCount: 1,
          count: 3,
        },
      });
    });

    it('leaves the skipped out of the amounts and of the counts, and counts the month only', async () => {
      const { occurrence } = await world.create({
        kind: 'income',
        name: 'Mesada',
        expectedAmountCents: 85000,
        dateRule: { type: 'any_day' },
      });
      await world.create({
        kind: 'income',
        name: 'VR',
        expectedAmountCents: 77700,
        dateRule: { type: 'any_day' },
      });
      await world.send('POST', `/occurrences/${occurrence?.id}/skip`);

      const response = await world.send('GET', '/recurrences/summary?month=2026-10');

      expect(recurrenceSummarySchema.parse(await response.json()).incomes).toEqual({
        expectedCents: 77700,
        receivedCents: 0,
        missingCents: 77700,
        count: 1,
      });
    });

    it('never counts an occurrence that came in over the expected amount as missing', async () => {
      const { occurrence } = await world.create({
        kind: 'income',
        name: 'VR',
        expectedAmountCents: 77700,
        dateRule: { type: 'any_day', day: 5 },
      });
      await payIncome(occurrence?.id ?? '', 90000, '2026-10-02');

      const response = await world.send('GET', '/recurrences/summary?month=2026-10');

      expect(recurrenceSummarySchema.parse(await response.json()).incomes).toEqual({
        expectedCents: 77700,
        receivedCents: 90000,
        missingCents: 0,
        count: 1,
      });
    });

    it('leaves a dismissed income out even when it kept a payment already linked', async () => {
      const { occurrence } = await world.create({
        kind: 'income',
        name: 'Freela',
        expectedAmountCents: 100000,
        dateRule: { type: 'any_day' },
      });
      await payIncome(occurrence?.id ?? '', 40000, '2026-10-03');
      await world.send('POST', `/occurrences/${occurrence?.id}/skip`);

      const response = await world.send('GET', '/recurrences/summary?month=2026-10');

      expect(recurrenceSummarySchema.parse(await response.json()).incomes).toEqual({
        expectedCents: 0,
        receivedCents: 0,
        missingCents: 0,
        count: 0,
      });
    });

    it('leaves out the occurrence of a deleted recurrence, the set the list of recurrences shows', async () => {
      const { recurrence, occurrence } = await world.create({
        kind: 'income',
        name: 'Freela',
        expectedAmountCents: 100000,
        dateRule: { type: 'any_day' },
      });
      await world.create({
        kind: 'income',
        name: 'VR',
        expectedAmountCents: 77700,
        dateRule: { type: 'any_day', day: 5 },
      });
      await payIncome(occurrence?.id ?? '', 40000, '2026-10-03');
      await world.send('DELETE', `/recurrences/${recurrence.id}`);

      const summary = recurrenceSummarySchema.parse(
        await (await world.send('GET', '/recurrences/summary?month=2026-10')).json(),
      );
      const list = await world.send('GET', '/recurrences?month=2026-10');
      const listed = (await list.json()) as {
        items: { occurrence: { remainingCents: number; status: string } | null }[];
      };
      const missingOfList = listed.items.reduce(
        (total, item) => total + (item.occurrence?.remainingCents ?? 0),
        0,
      );

      // The deleted one kept its history, but it is neither in the list nor in the card.
      expect(listed.items).toHaveLength(1);
      expect(summary.incomes).toEqual({
        expectedCents: 77700,
        receivedCents: 0,
        missingCents: 77700,
        count: 1,
      });
      expect(summary.incomes.missingCents).toBe(missingOfList);
    });

    it('adds up the paid and the missing of an expense that came in over the expected amount', async () => {
      const { occurrence } = await world.create({
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 25 },
      });
      const payment = await insertTestExpense(world.database.db, world.checking, {
        cents: 12000,
        on: '2026-10-20',
      });
      await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {
        transactionId: payment,
      });

      const response = await world.send('GET', '/recurrences/summary?month=2026-10');

      expect(recurrenceSummarySchema.parse(await response.json()).expenses).toMatchObject({
        paidCents: 12000,
        missingCents: 0,
        count: 1,
      });
    });

    it('leaves a skipped expense out of what was paid and of what is missing', async () => {
      const { occurrence } = await world.create({
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 25 },
      });
      await world.send('POST', `/occurrences/${occurrence?.id}/skip`);

      const response = await world.send('GET', '/recurrences/summary?month=2026-10');

      expect(recurrenceSummarySchema.parse(await response.json()).expenses).toMatchObject({
        paidCents: 0,
        missingCents: 0,
        count: 0,
      });
    });

    it('is zero in a month with no occurrence', async () => {
      const response = await world.send('GET', '/recurrences/summary?month=2026-03');

      expect(recurrenceSummarySchema.parse(await response.json())).toEqual({
        incomes: { expectedCents: 0, receivedCents: 0, missingCents: 0, count: 0 },
        expenses: {
          expectedCents: 0,
          paidCents: 0,
          missingCents: 0,
          paidCount: 0,
          lateCount: 0,
          differentCount: 0,
          count: 0,
        },
      });
    });

    it('does not count the late ones of earlier months: only the occurrences of the month', async () => {
      await world.create({ startsMonth: '2026-10', dateRule: { type: 'fixed_day', day: 5 } });

      const november = world.at('2026-11-10T15:00:00.000Z');
      const response = await november('GET', '/recurrences/summary?month=2026-11');

      expect(recurrenceSummarySchema.parse(await response.json()).expenses).toMatchObject({
        count: 1,
        lateCount: 1,
        expectedCents: 10990,
        paidCents: 0,
        missingCents: 10990,
      });
    });

    it('answers 400 without the month', async () => {
      await world.expectError(
        await world.send('GET', '/recurrences/summary'),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('GET /recurrences/:id', () => {
    it('answers the recurrence with the last 6 occurrences up to this month, newest first', async () => {
      const { recurrence } = await world.create({
        name: 'Academia',
        startsMonth: '2026-03',
        dateRule: { type: 'any_day' },
      });
      // The routine covers only today and ahead: the past months of the history are created by a
      // clock that stood in them.
      for (const instant of [
        '2026-03-10T15:00:00.000Z',
        '2026-04-10T15:00:00.000Z',
        '2026-05-10T15:00:00.000Z',
        '2026-06-10T15:00:00.000Z',
        '2026-07-10T15:00:00.000Z',
        '2026-08-10T15:00:00.000Z',
        '2026-09-10T15:00:00.000Z',
      ]) {
        await world.at(instant)('GET', '/recurrences?month=2026-10');
      }

      const response = await world.send('GET', `/recurrences/${recurrence.id}`);

      expect(response.status).toBe(200);
      const detail = recurrenceDetailDtoSchema.parse(await response.json());
      expect(detail.id).toBe(recurrence.id);
      // 6 of the 8 that exist up to October (the 3 ahead stay out: decision R9).
      expect(detail.history.map((item) => item.month)).toEqual([
        '2026-10',
        '2026-09',
        '2026-08',
        '2026-07',
        '2026-06',
        '2026-05',
      ]);
    });

    it('reads a deleted recurrence too', async () => {
      const { recurrence } = await world.create();
      await world.send('DELETE', `/recurrences/${recurrence.id}`);

      const response = await world.send('GET', `/recurrences/${recurrence.id}`);

      expect(response.status).toBe(200);
      expect(recurrenceDetailDtoSchema.parse(await response.json()).archivedAt).not.toBeNull();
    });

    it('answers 404 RECURRENCE_NOT_FOUND, and 400 for an id that is not a uuid', async () => {
      await world.expectError(
        await world.send('GET', `/recurrences/${MISSING}`),
        404,
        'RECURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await world.send('GET', '/recurrences/abc'),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('POST /recurrences/preview', () => {
    const preview = async (body: unknown, request = world.send) => {
      const response = await request('POST', '/recurrences/preview', body);
      expect(response.status).toBe(200);

      return previewRecurrenceResponseSchema.parse(await response.json()).occurrences;
    };

    it('gives the next 3 occurrences of the rule: "por volta de 25/11, 25/12 e 25/01"', async () => {
      const occurrences = await preview({
        dateRule: { type: 'around_day', day: 25, toleranceDays: 2 },
      });

      expect(occurrences.map((item) => [item.month, item.expectedOn])).toEqual([
        ['2026-10', '2026-10-25'],
        ['2026-11', '2026-11-25'],
        ['2026-12', '2026-12-25'],
      ]);
      expect(occurrences[0]).toMatchObject({
        windowStartOn: '2026-10-23',
        windowEndOn: '2026-10-27',
      });
    });

    it('skips a month whose window has already ended, and counts today as not ended', async () => {
      // Today is 22/10: the window of the 10th ended on the 13th, the one of the 22nd ends on the 25th.
      expect(
        (await preview({ dateRule: { type: 'fixed_day', day: 10 } })).map((item) => item.month),
      ).toEqual(['2026-11', '2026-12', '2027-01']);
      expect(
        (await preview({ dateRule: { type: 'fixed_day', day: 22 } })).map((item) => item.month),
      ).toEqual(['2026-10', '2026-11', '2026-12']);
      // The window ends today, inclusive: day 19 has a window from 16 to 22.
      expect(
        (await preview({ dateRule: { type: 'fixed_day', day: 19 } })).map((item) => item.month)[0],
      ).toBe('2026-10');
      expect(
        (await preview({ dateRule: { type: 'fixed_day', day: 18 } })).map((item) => item.month)[0],
      ).toBe('2026-11');
    });

    it('has a null expected day for any day with no likely day', async () => {
      const occurrences = await preview({ dateRule: { type: 'any_day' } });

      expect(occurrences[0]).toEqual({
        month: '2026-10',
        expectedOn: null,
        windowStartOn: '2026-10-01',
        windowEndOn: '2026-10-31',
      });
    });

    it('starts at the first month asked when it is after the current one, and at the current one when before', async () => {
      expect(
        (await preview({ dateRule: { type: 'fixed_day', day: 25 }, startsMonth: '2027-02' })).map(
          (item) => item.month,
        ),
      ).toEqual(['2027-02', '2027-03', '2027-04']);
      expect(
        (await preview({ dateRule: { type: 'fixed_day', day: 25 }, startsMonth: '2026-01' })).map(
          (item) => item.month,
        )[0],
      ).toBe('2026-10');
    });

    it('moves a fixed day off the weekend with the shift, and the window follows', async () => {
      const occurrences = await preview({
        dateRule: { type: 'fixed_day', day: 10, nonBusinessDayShift: 'after' },
        startsMonth: '2027-01',
      });

      expect(occurrences[0]).toMatchObject({
        month: '2027-01',
        expectedOn: '2027-01-11',
        windowStartOn: '2027-01-08',
        windowEndOn: '2027-01-14',
      });
    });

    it('follows the day in São Paulo: at 23:30 of the 25th the window of the 25th is still open', async () => {
      // 26/10 02:30 UTC is 25/10 23:30 in São Paulo.
      const late = world.at('2026-10-26T02:30:00.000Z');
      const occurrences = await preview({ dateRule: { type: 'fixed_day', day: 22 } }, late);

      expect(occurrences[0]?.month).toBe('2026-10');

      // 26/10 03:00 UTC is already 26/10 in São Paulo: the window of the 22nd (to the 25th) ended.
      const next = world.at('2026-10-26T03:00:00.000Z');
      expect((await preview({ dateRule: { type: 'fixed_day', day: 22 } }, next))[0]?.month).toBe(
        '2026-11',
      );
    });

    it('answers 400 for a rule that is incomplete, and without a body', async () => {
      await world.expectError(
        await world.send('POST', '/recurrences/preview', { dateRule: { type: 'fixed_day' } }),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await world.send('POST', '/recurrences/preview', {}),
        400,
        'VALIDATION_FAILED',
      );
    });

    it('is not swallowed by /recurrences/:id', async () => {
      const response = await world.send('POST', '/recurrences/preview', {
        dateRule: { type: 'any_day' },
      });

      expect(response.status).toBe(200);
    });
  });

  it('keeps a occurrences list of a month in step with the recurrences list', async () => {
    await world.create({ name: 'Academia', dateRule: { type: 'fixed_day', day: 25 } });

    const items = await listOf('2026-10');
    const response = await world.send('GET', '/occurrences?month=2026-10');
    const occurrences = listResponseSchema(occurrenceDtoSchema).parse(await response.json()).items;

    expect(occurrences.map((item) => item.id)).toEqual(items.map((item) => item.occurrence?.id));
  });
});
