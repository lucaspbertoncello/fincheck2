import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';

const MISSING = '01939000-0000-7000-8000-00000000dead';

describe('recurrence changes', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const occurrencesOf = async (month: string) => {
    const response = await world.send('GET', `/occurrences?month=${month}`);

    return listResponseSchema(occurrenceDtoSchema).parse(await response.json()).items;
  };
  const rowsOf = (recurrenceId: string) =>
    world.database.db
      .selectFrom('recurrence_occurrences')
      .select(['month', 'expected_amount_cents', 'expected_on', 'window_end_on'])
      .where('recurrence_id', '=', recurrenceId)
      .orderBy('month')
      .execute();
  const patch = (id: string, body: unknown) => world.send('PATCH', `/recurrences/${id}`, body);

  describe('PATCH /recurrences/:id', () => {
    it('changes the recurrence at once and answers it whole', async () => {
      const { recurrence } = await world.create();

      const response = await patch(recurrence.id, { name: 'Academia Smart', maxPayments: 2 });

      expect(await world.recurrenceOf(response)).toMatchObject({
        id: recurrence.id,
        name: 'Academia Smart',
        maxPayments: 2,
        expectedAmountCents: 10990,
      });
    });

    it('changes maxPayments to "as many as come" with null alone, and back to a number', async () => {
      const { recurrence } = await world.create({ maxPayments: 2 });

      const toAny = await patch(recurrence.id, { maxPayments: null });
      expect(await world.recurrenceOf(toAny)).toMatchObject({ maxPayments: null });
      const stillAny = await patch(recurrence.id, { name: 'Outro nome' });
      expect(await world.recurrenceOf(stillAny)).toMatchObject({ maxPayments: null });
      const toThree = await patch(recurrence.id, { maxPayments: 3 });
      expect(await world.recurrenceOf(toThree)).toMatchObject({ maxPayments: 3 });
      expect((await patch(recurrence.id, { maxPayments: 6 })).status).toBe(400);
    });

    it('clears the fields that may be empty with null', async () => {
      const categoryId = await insertTestCategory(world.database.db);
      const { recurrence } = await world.create({
        counterparty: 'Smart Fit',
        matchText: 'smart',
        categoryId,
        accountId: world.checking,
        method: 'pix',
      });

      const response = await patch(recurrence.id, {
        counterparty: null,
        matchText: null,
        categoryId: null,
        accountId: null,
        method: null,
      });

      expect(await world.recurrenceOf(response)).toMatchObject({
        counterparty: null,
        matchText: null,
        categoryId: null,
        accountId: null,
        method: null,
      });
    });

    it('writes the match text normalized', async () => {
      const { recurrence } = await world.create();

      const response = await patch(recurrence.id, { matchText: ' Salário  da Empresa ' });

      expect((await world.recurrenceOf(response)).matchText).toBe('SALARIO DA EMPRESA');
    });

    describe('the occurrences ("A mudança vale")', () => {
      it('redoes the months after the current one and leaves this one ("Daqui para a frente")', async () => {
        const { recurrence } = await world.create();

        await patch(recurrence.id, { expectedAmountCents: 12990 });

        expect((await rowsOf(recurrence.id)).map((row) => row.expected_amount_cents)).toEqual([
          10990, 12990, 12990, 12990,
        ]);
      });

      it('also redoes this month with "Também em outubro", when nobody touched it', async () => {
        const { recurrence } = await world.create();

        await patch(recurrence.id, { expectedAmountCents: 12990, applyFrom: 'current_month' });

        expect((await rowsOf(recurrence.id)).map((row) => row.expected_amount_cents)).toEqual([
          12990, 12990, 12990, 12990,
        ]);
      });

      it('never touches a month that has a payment or a mark, even when asked for this month', async () => {
        const { recurrence, occurrence } = await world.create();
        const transactionId = await insertTestExpense(world.database.db, world.checking, {
          cents: 10990,
          on: '2026-10-10',
        });
        await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId });
        const november = (await occurrencesOf('2026-11'))[0];
        await world.send('POST', `/occurrences/${november?.id}/skip`);

        await patch(recurrence.id, { expectedAmountCents: 12990, applyFrom: 'current_month' });

        expect((await rowsOf(recurrence.id)).map((row) => row.expected_amount_cents)).toEqual([
          10990, 10990, 12990, 12990,
        ]);
      });

      it('never touches a past month', async () => {
        const { recurrence } = await world.create();
        await world.at('2026-12-02T15:00:00.000Z')('GET', '/recurrences?month=2026-12');

        await world.at('2026-12-02T15:00:00.000Z')('PATCH', `/recurrences/${recurrence.id}`, {
          expectedAmountCents: 12990,
          applyFrom: 'current_month',
        });

        // October and November are past on 02/12: they keep the old amount; December on, which the
        // routine now covers up to March, takes the new one.
        expect((await rowsOf(recurrence.id)).map((row) => row.expected_amount_cents)).toEqual([
          10990, 10990, 12990, 12990, 12990, 12990,
        ]);
      });

      it('copies only the field that moved: a month edited by hand keeps its amount when only the day changes', async () => {
        const { recurrence } = await world.create();
        const december = (await occurrencesOf('2026-12'))[0];
        await world.send('PATCH', `/occurrences/${december?.id}`, { expectedAmountCents: 15000 });

        await patch(recurrence.id, { dateRule: { type: 'fixed_day', day: 20 } });

        const rows = await rowsOf(recurrence.id);
        expect(rows.map((row) => row.expected_amount_cents)).toEqual([10990, 10990, 15000, 10990]);
        expect(rows.map((row) => row.expected_on)).toEqual([
          '2026-10-10',
          '2026-11-20',
          '2026-12-20',
          '2027-01-20',
        ]);
      });

      it('does not recopy the amount when the value sent is the one it already has', async () => {
        const { recurrence } = await world.create();
        const december = (await occurrencesOf('2026-12'))[0];
        await world.send('PATCH', `/occurrences/${december?.id}`, { expectedAmountCents: 15000 });

        await patch(recurrence.id, { expectedAmountCents: 10990, name: 'Academia 2' });

        expect((await rowsOf(recurrence.id)).map((row) => row.expected_amount_cents)).toEqual([
          10990, 10990, 15000, 10990,
        ]);
      });

      it('recopies the amount over a month edited by hand when the amount really changes', async () => {
        const { recurrence } = await world.create();
        const december = (await occurrencesOf('2026-12'))[0];
        await world.send('PATCH', `/occurrences/${december?.id}`, { expectedAmountCents: 15000 });

        await patch(recurrence.id, { expectedAmountCents: 12990 });

        expect((await rowsOf(recurrence.id)).map((row) => row.expected_amount_cents)).toEqual([
          10990, 12990, 12990, 12990,
        ]);
      });

      it('moves the day and the window of the months after with a new rule, with the shift applied', async () => {
        const { recurrence } = await world.create({ dateRule: { type: 'fixed_day', day: 25 } });

        await patch(recurrence.id, {
          dateRule: { type: 'fixed_day', day: 10, nonBusinessDayShift: 'after' },
        });

        const rows = await rowsOf(recurrence.id);
        // 10/01/2027 is a Sunday: it goes to Monday the 11th, window ending the 14th.
        expect(rows.map((row) => [row.month, row.expected_on, row.window_end_on])).toEqual([
          ['2026-10', '2026-10-25', '2026-10-28'],
          ['2026-11', '2026-11-10', '2026-11-13'],
          ['2026-12', '2026-12-10', '2026-12-13'],
          ['2027-01', '2027-01-11', '2027-01-14'],
        ]);
      });

      it('drops the untouched occurrences before a first month that moved later, from this month on', async () => {
        const { recurrence, occurrence } = await world.create();
        const transactionId = await insertTestExpense(world.database.db, world.checking, {
          cents: 10990,
          on: '2026-11-10',
        });
        const november = (await occurrencesOf('2026-11'))[0];
        await world.send('POST', `/occurrences/${november?.id}/payments`, { transactionId });

        await patch(recurrence.id, { startsMonth: '2026-12' });

        // October (untouched) is gone; November has a payment and stays; December and January stay.
        expect((await rowsOf(recurrence.id)).map((row) => row.month)).toEqual([
          '2026-11',
          '2026-12',
          '2027-01',
        ]);
        expect(occurrence?.month).toBe('2026-10');
      });

      it('creates the occurrences that are missing when the first month moves earlier', async () => {
        const { recurrence } = await world.create({ startsMonth: '2026-12' });
        expect(await rowsOf(recurrence.id)).toHaveLength(2);

        await patch(recurrence.id, { startsMonth: '2026-10' });

        expect((await rowsOf(recurrence.id)).map((row) => row.month)).toEqual([
          '2026-10',
          '2026-11',
          '2026-12',
          '2027-01',
        ]);
      });
    });

    describe('the errors of the contract', () => {
      it('404 RECURRENCE_NOT_FOUND', async () => {
        await world.expectError(await patch(MISSING, { name: 'X' }), 404, 'RECURRENCE_NOT_FOUND');
      });

      it('422 RECURRENCE_ARCHIVED', async () => {
        const { recurrence } = await world.create();
        await world.send('DELETE', `/recurrences/${recurrence.id}`);

        await world.expectError(
          await patch(recurrence.id, { name: 'X' }),
          422,
          'RECURRENCE_ARCHIVED',
        );
      });

      it('422 RECURRENCE_REGIME_ONLY_FOR_INCOME', async () => {
        const { recurrence } = await world.create();

        await world.expectError(
          await patch(recurrence.id, { employmentRegime: 'clt' }),
          422,
          'RECURRENCE_REGIME_ONLY_FOR_INCOME',
        );
      });

      it('accepts a regime on an income and clearing it', async () => {
        const { recurrence } = await world.create({ kind: 'income', name: 'Maxxy' });

        const set = await patch(recurrence.id, { employmentRegime: 'pj' });
        expect((await world.recurrenceOf(set)).employmentRegime).toBe('pj');
        const cleared = await patch(recurrence.id, { employmentRegime: null });
        expect((await world.recurrenceOf(cleared)).employmentRegime).toBeNull();
      });

      it('422 RECURRENCE_CATEGORY_KIND_MISMATCH', async () => {
        const { recurrence } = await world.create();
        const categoryId = await insertTestCategory(world.database.db, {
          kind: 'income',
          name: 'Receita teste',
        });

        await world.expectError(
          await patch(recurrence.id, { categoryId }),
          422,
          'RECURRENCE_CATEGORY_KIND_MISMATCH',
        );
      });

      it('404 ACCOUNT_NOT_FOUND and CATEGORY_NOT_FOUND', async () => {
        const { recurrence } = await world.create();

        await world.expectError(
          await patch(recurrence.id, { accountId: MISSING }),
          404,
          'ACCOUNT_NOT_FOUND',
        );
        await world.expectError(
          await patch(recurrence.id, { categoryId: MISSING }),
          404,
          'CATEGORY_NOT_FOUND',
        );
      });

      it('400 without a field besides applyFrom, and with a field that cannot change (kind)', async () => {
        const { recurrence } = await world.create();

        await world.expectError(await patch(recurrence.id, {}), 400, 'VALIDATION_FAILED');
        await world.expectError(
          await patch(recurrence.id, { applyFrom: 'current_month' }),
          400,
          'VALIDATION_FAILED',
        );
        await world.expectError(
          await patch(recurrence.id, { kind: 'income' }),
          400,
          'VALIDATION_FAILED',
        );
      });

      it('400 for a subscription mark off with a service, and the mark on an income', async () => {
        const { recurrence } = await world.create({ isSubscription: true, serviceSlug: 'netflix' });
        const income = await world.create({ kind: 'income', name: 'Salário' });

        const off = await patch(recurrence.id, { isSubscription: false, serviceSlug: 'netflix' });
        expect(off.status).toBe(400);
        const onIncome = await patch(income.recurrence.id, { isSubscription: true });
        expect(onIncome.status).toBe(400);
        const body = (await onIncome.json()) as {
          code: string;
          details: { issues: { path: string }[] };
        };
        expect(body.code).toBe('VALIDATION_FAILED');
        expect(body.details.issues[0]?.path).toBe('isSubscription');
      });

      it('400 for a date rule that is incomplete, and for a malformed id', async () => {
        const { recurrence } = await world.create();

        await world.expectError(
          await patch(recurrence.id, { dateRule: { type: 'business_day' } }),
          400,
          'VALIDATION_FAILED',
        );
        await world.expectError(await patch('abc', { name: 'X' }), 400, 'VALIDATION_FAILED');
      });

      it('turns the subscription mark off and drops the service with it', async () => {
        const { recurrence } = await world.create({ isSubscription: true, serviceSlug: 'netflix' });

        const response = await patch(recurrence.id, { isSubscription: false });

        expect(await world.recurrenceOf(response)).toMatchObject({
          isSubscription: false,
          serviceSlug: null,
        });
      });

      it('401 without the local token', async () => {
        const { recurrence } = await world.create();

        await world.expectError(
          await world.send(
            'PATCH',
            `/recurrences/${recurrence.id}`,
            { name: 'X' },
            {
              [LOCAL_TOKEN_HEADER]: 'wrong',
            },
          ),
          401,
          'LOCAL_TOKEN_INVALID',
        );
      });
    });
  });

  describe('POST /recurrences/:id/pause and /resume', () => {
    it('pauses: drops the untouched months after this one and keeps this one', async () => {
      const { recurrence } = await world.create();

      const response = await world.send('POST', `/recurrences/${recurrence.id}/pause`);

      expect((await world.recurrenceOf(response)).pausedAt).not.toBeNull();
      expect((await rowsOf(recurrence.id)).map((row) => row.month)).toEqual(['2026-10']);
    });

    it('keeps the months after this one that have a payment or a mark', async () => {
      const { recurrence } = await world.create();
      const december = (await occurrencesOf('2026-12'))[0];
      await world.send('POST', `/occurrences/${december?.id}/skip`);

      await world.send('POST', `/recurrences/${recurrence.id}/pause`);

      expect((await rowsOf(recurrence.id)).map((row) => row.month)).toEqual(['2026-10', '2026-12']);
    });

    it('resumes: clears the pause and creates the months that are missing, without touching the rest', async () => {
      const { recurrence } = await world.create();
      const december = (await occurrencesOf('2026-12'))[0];
      await world.send('POST', `/occurrences/${december?.id}/skip`);
      await world.send('POST', `/recurrences/${recurrence.id}/pause`);

      const response = await world.send('POST', `/recurrences/${recurrence.id}/resume`);

      expect((await world.recurrenceOf(response)).pausedAt).toBeNull();
      const rows = await rowsOf(recurrence.id);
      expect(rows.map((row) => row.month)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01']);
      const kept = await world.database.db
        .selectFrom('recurrence_occurrences')
        .select('skipped_at')
        .where('id', '=', december?.id ?? '')
        .executeTakeFirstOrThrow();
      expect(kept.skipped_at).not.toBeNull();
    });

    it('409 RECURRENCE_ALREADY_PAUSED and RECURRENCE_NOT_PAUSED', async () => {
      const { recurrence } = await world.create();

      await world.expectError(
        await world.send('POST', `/recurrences/${recurrence.id}/resume`),
        409,
        'RECURRENCE_NOT_PAUSED',
      );
      await world.send('POST', `/recurrences/${recurrence.id}/pause`);
      await world.expectError(
        await world.send('POST', `/recurrences/${recurrence.id}/pause`),
        409,
        'RECURRENCE_ALREADY_PAUSED',
      );
    });

    it('422 RECURRENCE_ARCHIVED and 404 RECURRENCE_NOT_FOUND', async () => {
      const { recurrence } = await world.create();
      await world.send('DELETE', `/recurrences/${recurrence.id}`);

      for (const action of ['pause', 'resume']) {
        await world.expectError(
          await world.send('POST', `/recurrences/${recurrence.id}/${action}`),
          422,
          'RECURRENCE_ARCHIVED',
        );
        await world.expectError(
          await world.send('POST', `/recurrences/${MISSING}/${action}`),
          404,
          'RECURRENCE_NOT_FOUND',
        );
        await world.expectError(
          await world.send('POST', `/recurrences/abc/${action}`),
          400,
          'VALIDATION_FAILED',
        );
      }
    });
  });

  describe('DELETE /recurrences/:id', () => {
    it('archives, answers 204 and drops the untouched occurrences of this month on', async () => {
      const { recurrence } = await world.create();

      const response = await world.send('DELETE', `/recurrences/${recurrence.id}`);

      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(await rowsOf(recurrence.id)).toEqual([]);
      const detail = await world.send('GET', `/recurrences/${recurrence.id}`);
      expect(((await detail.json()) as { archivedAt: string | null }).archivedAt).not.toBeNull();
    });

    it('keeps the ones with a payment or a mark, and the ones of past months, as history', async () => {
      const { recurrence } = await world.create();
      // A past month the routine left behind (10/2026 is past on 02/12/2026).
      const later = world.at('2026-12-02T15:00:00.000Z');
      await later('GET', '/recurrences?month=2026-12');
      const december = (await occurrencesOf('2026-12'))[0];
      await world.send('POST', `/occurrences/${december?.id}/settle`);

      await later('DELETE', `/recurrences/${recurrence.id}`);

      // October and November are past on 02/12 and stay; December has a mark and stays; January goes.
      expect((await rowsOf(recurrence.id)).map((row) => row.month)).toEqual([
        '2026-10',
        '2026-11',
        '2026-12',
      ]);
    });

    it('does not bring the occurrences back: a deleted recurrence generates nothing', async () => {
      const { recurrence } = await world.create();
      await world.send('DELETE', `/recurrences/${recurrence.id}`);

      await world.at('2026-12-02T15:00:00.000Z')('GET', '/recurrences?month=2026-12');

      expect(await rowsOf(recurrence.id)).toEqual([]);
    });

    it('is the same twice: 204 again, and the date of the deletion is the first one', async () => {
      const { recurrence } = await world.create();
      await world.send('DELETE', `/recurrences/${recurrence.id}`);
      const first = await world.database.db
        .selectFrom('recurrences')
        .select('archived_at')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();

      const again = await world.at('2026-10-25T15:00:00.000Z')(
        'DELETE',
        `/recurrences/${recurrence.id}`,
      );

      expect(again.status).toBe(204);
      const second = await world.database.db
        .selectFrom('recurrences')
        .select('archived_at')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();
      expect(second.archived_at).toBe(first.archived_at);
    });

    it('404 RECURRENCE_NOT_FOUND, 400 for a malformed id and 401 without the token', async () => {
      await world.expectError(
        await world.send('DELETE', `/recurrences/${MISSING}`),
        404,
        'RECURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await world.send('DELETE', '/recurrences/abc'),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await world.send('DELETE', `/recurrences/${MISSING}`, undefined, {
          [LOCAL_TOKEN_HEADER]: 'wrong',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });
});
