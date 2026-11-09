import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  occurrenceCandidateDtoSchema,
  occurrenceDtoSchema,
} from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

const MISSING = '01939000-0000-7000-8000-00000000dead';

describe('occurrence routes', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const listOf = async (month: string, extra = '', request = world.send) => {
    const response = await request('GET', `/occurrences?month=${month}${extra}`);
    expect(response.status).toBe(200);

    return listResponseSchema(occurrenceDtoSchema).parse(await response.json()).items;
  };
  const link = (occurrenceId: string, transactionId: string) =>
    world.send('POST', `/occurrences/${occurrenceId}/payments`, { transactionId });
  const post = (path: string, body?: unknown) => world.send('POST', path, body);

  describe('GET /occurrences', () => {
    it('lists the occurrences of the month by expected day, the ones with no day last, then by name', async () => {
      await world.create({ name: 'Zeca', dateRule: { type: 'fixed_day', day: 20 } });
      await world.create({ name: 'Água', dateRule: { type: 'fixed_day', day: 20 } });
      await world.create({ name: 'Aluguel', dateRule: { type: 'fixed_day', day: 5 } });
      await world.create({ name: 'Sem dia', dateRule: { type: 'any_day' } });

      const items = await listOf('2026-10');

      expect(items.map((item) => item.recurrenceName)).toEqual([
        'Aluguel',
        'Água',
        'Zeca',
        'Sem dia',
      ]);
      expect(items.map((item) => item.carriedOver)).toEqual([false, false, false, false]);
    });

    it('turns late at midnight in São Paulo, not at midnight in UTC (the window of the 10th ends on the 13th)', async () => {
      await world.create({ name: 'Academia', dateRule: { type: 'fixed_day', day: 10 } });

      // 14/10 02:59 UTC is 13/10 23:59 in São Paulo: the last day of the window.
      const lastMinute = await listOf('2026-10', '', world.at('2026-10-14T02:59:00.000Z'));
      // 14/10 03:00 UTC is 14/10 00:00 in São Paulo: the window is over.
      const midnight = await listOf('2026-10', '', world.at('2026-10-14T03:00:00.000Z'));

      expect(lastMinute[0]).toMatchObject({ status: 'expected', needsAttention: false });
      expect(midnight[0]).toMatchObject({ status: 'late', needsAttention: true });
    });

    it('filters by what asks for action: late, or a difference with no answer', async () => {
      await world.create({ name: 'Atrasada', dateRule: { type: 'fixed_day', day: 5 } });
      await world.create({ name: 'A caminho', dateRule: { type: 'fixed_day', day: 28 } });

      expect(
        (await listOf('2026-10', '&needsAttention=true')).map((item) => item.recurrenceName),
      ).toEqual(['Atrasada']);
      expect(
        (await listOf('2026-10', '&needsAttention=false')).map((item) => item.recurrenceName),
      ).toEqual(['A caminho']);
      expect(await listOf('2026-10')).toHaveLength(2);
    });

    it('names each payment by the description its transaction has today', async () => {
      const { occurrence } = await world.create({
        expectedAmountCents: 85000,
        maxPayments: 2,
        kind: 'income',
        dateRule: { type: 'any_day' },
      });
      const first = await insertTestIncome(world.database.db, world.checking, {
        cents: 42500,
        on: '2026-10-03',
        description: 'Pix de Jorge',
      });
      const second = await insertTestIncome(world.database.db, world.checking, {
        cents: 20000,
        on: '2026-10-09',
        description: 'Pix de Maria',
      });
      await link(occurrence?.id ?? '', second);
      await link(occurrence?.id ?? '', first);
      await world.database.db
        .updateTable('transactions')
        .set({ description: 'Pix do Jorge (editado)' })
        .where('id', '=', first)
        .execute();

      const [item] = await listOf('2026-10');

      expect(item?.payments.map((payment) => [payment.transactionId, payment.description])).toEqual(
        [
          [first, 'Pix do Jorge (editado)'],
          [second, 'Pix de Maria'],
        ],
      );
    });

    it('brings the late ones of earlier months into the current month, marked carriedOver, until they are answered (R6)', async () => {
      const { occurrence } = await world.create({
        name: 'Academia',
        dateRule: { type: 'fixed_day', day: 5 },
      });
      await world.create({
        name: 'Netflix',
        dateRule: { type: 'fixed_day', day: 12 },
        expectedAmountCents: 5590,
      });

      const november = world.at('2026-11-20T15:00:00.000Z');
      const items = await listOf('2026-11', '', november);

      const carried = items.filter((item) => item.carriedOver);
      // October of both recurrences is late and carried; November's own are late too, not carried.
      expect(carried.map((item) => [item.recurrenceName, item.month]).toSorted()).toEqual([
        ['Academia', '2026-10'],
        ['Netflix', '2026-10'],
      ]);
      expect(carried.every((item) => item.status === 'late' && item.needsAttention)).toBe(true);
      expect(
        items.filter((item) => !item.carriedOver).every((item) => item.month === '2026-11'),
      ).toBe(true);

      // Answered, it goes: skip the one of October.
      await world.send('POST', `/occurrences/${occurrence?.id}/skip`);
      const after = await listOf('2026-11', '', november);
      expect(after.filter((item) => item.carriedOver).map((item) => item.recurrenceName)).toEqual([
        'Netflix',
      ]);
    });

    it('also carries a difference that nobody answered, and stops carrying it once it is answered', async () => {
      const { occurrence } = await world.create({
        name: 'Plano',
        expectedAmountCents: 21900,
        dateRule: { type: 'fixed_day', day: 20 },
      });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 20000,
        on: '2026-10-20',
      });
      await link(occurrence?.id ?? '', transactionId);
      const november = world.at('2026-11-05T15:00:00.000Z');

      expect(
        (await listOf('2026-11', '&needsAttention=true', november)).map((item) => [
          item.month,
          item.carriedOver,
        ]),
      ).toEqual([['2026-10', true]]);

      await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'keep' });
      expect(await listOf('2026-11', '&needsAttention=true', november)).toEqual([]);
    });

    it('does not carry what is skipped, marked by hand, confirmed with no difference or of a deleted recurrence', async () => {
      const skipped = await world.create({
        name: 'Dispensada',
        dateRule: { type: 'fixed_day', day: 5 },
      });
      const settled = await world.create({
        name: 'Marcada',
        dateRule: { type: 'fixed_day', day: 5 },
      });
      const paid = await world.create({ name: 'Paga', dateRule: { type: 'fixed_day', day: 5 } });
      const gone = await world.create({
        name: 'Excluída',
        dateRule: { type: 'fixed_day', day: 5 },
      });
      await post(`/occurrences/${skipped.occurrence?.id}/skip`);
      await post(`/occurrences/${settled.occurrence?.id}/settle`);
      const payment = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-05',
      });
      await link(paid.occurrence?.id ?? '', payment);
      await world.send('DELETE', `/recurrences/${gone.recurrence.id}`);

      expect(await listOf('2026-11', '', world.at('2026-11-20T15:00:00.000Z'))).toSatisfy(
        (items: { carriedOver: boolean }[]) => items.every((item) => !item.carriedOver),
      );
    });

    it('carries the late ones of the last 3 months only: an older one stays where it was, and can still be dismissed', async () => {
      const { occurrence } = await world.create({ dateRule: { type: 'fixed_day', day: 5 } });

      // Created on 22/10: October to January exist and are all late by February.
      const january = world.at('2027-01-20T15:00:00.000Z');
      expect(
        (await listOf('2027-01', '&needsAttention=true', january))
          .filter((item) => item.carriedOver)
          .map((item) => item.month),
      ).toEqual(['2026-10', '2026-11', '2026-12']);

      const february = world.at('2027-02-10T15:00:00.000Z');
      expect(
        (await listOf('2027-02', '&needsAttention=true', february))
          .filter((item) => item.carriedOver)
          .map((item) => item.month),
      ).toEqual(['2026-11', '2026-12', '2027-01']);

      // October no longer comes along, but it is still there and can be dismissed.
      const skipped = await world.occurrenceOf(await post(`/occurrences/${occurrence?.id}/skip`));
      expect(skipped.status).toBe('skipped');
    });

    it('does not carry the late occurrences of a paused recurrence, and carries them again when it comes back', async () => {
      const { recurrence } = await world.create({ dateRule: { type: 'fixed_day', day: 5 } });
      const other = await world.create({ name: 'Outra', dateRule: { type: 'fixed_day', day: 5 } });
      await world.send('POST', `/recurrences/${recurrence.id}/pause`);
      const november = world.at('2026-11-20T15:00:00.000Z');

      const carried = (await listOf('2026-11', '', november)).filter((item) => item.carriedOver);

      expect(carried.map((item) => item.recurrenceId)).toEqual([other.recurrence.id]);

      await november('POST', `/recurrences/${recurrence.id}/resume`);
      const back = (await listOf('2026-11', '', november)).filter((item) => item.carriedOver);
      expect(back.map((item) => item.recurrenceId).toSorted()).toEqual(
        [recurrence.id, other.recurrence.id].toSorted(),
      );
    });

    it('only carries into the current month', async () => {
      await world.create({ dateRule: { type: 'fixed_day', day: 5 } });
      const november = world.at('2026-11-20T15:00:00.000Z');

      // December is not the current month: its own occurrence only.
      expect(
        (await listOf('2026-12', '', november)).every((item) => item.month === '2026-12'),
      ).toBe(true);
      // October is past: its own, late, and nothing else.
      expect(await listOf('2026-10', '', november)).toHaveLength(1);
    });

    it('shows the occurrence of a deleted recurrence only when it is history', async () => {
      const paid = await world.create({ name: 'Paga' });
      const untouched = await world.create({ name: 'Sem nada' });
      const payment = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(paid.occurrence?.id ?? '', payment);
      await world.at('2026-12-02T15:00:00.000Z')('GET', '/recurrences?month=2026-12');
      await world.send('DELETE', `/recurrences/${paid.recurrence.id}`);
      await world.send('DELETE', `/recurrences/${untouched.recurrence.id}`);

      expect((await listOf('2026-10')).map((item) => item.recurrenceName)).toEqual(['Paga']);
    });

    it('answers 400 without the month, with a malformed one and with an invalid filter; 401 without the token', async () => {
      for (const path of [
        '/occurrences',
        '/occurrences?month=2026-13',
        '/occurrences?month=1999-01',
        '/occurrences?month=2026-10&needsAttention=maybe',
      ]) {
        await world.expectError(await world.send('GET', path), 400, 'VALIDATION_FAILED');
      }
      await world.expectError(
        await world.send('GET', '/occurrences?month=2026-10', undefined, {
          [LOCAL_TOKEN_HEADER]: 'wrong',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('GET /occurrences/:id/candidates', () => {
    const candidatesOf = async (occurrenceId: string | undefined) => {
      const response = await world.send('GET', `/occurrences/${occurrenceId}/candidates`);
      expect(response.status).toBe(200);

      return listResponseSchema(occurrenceCandidateDtoSchema).parse(await response.json()).items;
    };

    it('offers the credits of an income, not tied to anything, within 15 days of the window, closest to what is left first', async () => {
      // The window of the 15th is 12 to 18 October: candidates from 27/09 to 03/11.
      const { occurrence } = await world.create({
        kind: 'income',
        name: 'Salário',
        expectedAmountCents: 140000,
        dateRule: { type: 'fixed_day', day: 15 },
      });
      const exact = await insertTestIncome(world.database.db, world.checking, {
        cents: 140000,
        on: '2026-10-15',
        counterparty: 'TREETOOLS',
      });
      const near = await insertTestIncome(world.database.db, world.checking, {
        cents: 120000,
        on: '2026-10-14',
      });
      const nearer = await insertTestIncome(world.database.db, world.checking, {
        cents: 120000,
        on: '2026-10-16',
      });
      const edgeStart = await insertTestIncome(world.database.db, world.checking, {
        cents: 1000,
        on: '2026-09-27',
      });
      const edgeEnd = await insertTestIncome(world.database.db, world.checking, {
        cents: 1000,
        on: '2026-11-02',
      });
      await insertTestIncome(world.database.db, world.checking, { cents: 1000, on: '2026-09-26' });
      await insertTestIncome(world.database.db, world.checking, { cents: 1000, on: '2026-11-03' });

      const items = await candidatesOf(occurrence?.id);

      // 03/11 is 15 days after the end of the window (18/10 + 15 days = 02/11).
      expect(items.map((item) => item.transactionId)).toEqual([
        exact,
        nearer,
        near,
        edgeEnd,
        edgeStart,
      ]);
      expect(items[0]).toMatchObject({
        transactionId: exact,
        amountCents: 140000,
        occurredOn: '2026-10-15',
        accountId: world.checking,
        counterparty: 'TREETOOLS',
        description: 'Pix recebido',
      });
    });

    it('offers debits of nature expense for an expense, with the sign of the transaction', async () => {
      const { occurrence } = await world.create();
      const debit = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await insertTestIncome(world.database.db, world.checking, { cents: 10990, on: '2026-10-10' });

      const items = await candidatesOf(occurrence?.id);

      expect(items).toEqual([
        expect.objectContaining({ transactionId: debit, amountCents: -10990 }),
      ]);
    });

    it('leaves out the ignored, the removed by the bank, the other natures and the ones already tied to an occurrence', async () => {
      const { occurrence } = await world.create({ name: 'A' });
      const other = await world.create({ name: 'B' });
      const free = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await insertTestExpense(world.database.db, world.checking, {
        cents: 1,
        on: '2026-10-10',
        overrides: { ignored_at: '2026-10-11T12:00:00.000Z' },
      });
      await insertTestExpense(world.database.db, world.checking, {
        cents: 1,
        on: '2026-10-10',
        overrides: { bank_removed_at: '2026-10-11T12:00:00.000Z' },
      });
      await insertTestExpense(world.database.db, world.checking, {
        cents: 1,
        on: '2026-10-10',
        overrides: { nature: 'transfer' },
      });
      await insertTestExpense(world.database.db, world.checking, {
        cents: 1,
        on: '2026-10-10',
        overrides: { nature: 'invoice_payment' },
      });
      const taken = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(other.occurrence?.id ?? '', taken);

      expect((await candidatesOf(occurrence?.id)).map((item) => item.transactionId)).toEqual([
        free,
      ]);
    });

    it('orders by closeness to the expected amount when nothing is left, then newest first', async () => {
      const { occurrence } = await world.create({ expectedAmountCents: 10000, maxPayments: 2 });
      const paid = await insertTestExpense(world.database.db, world.checking, {
        cents: 10000,
        on: '2026-10-10',
      });
      await link(occurrence?.id ?? '', paid);
      const far = await insertTestExpense(world.database.db, world.checking, {
        cents: 30000,
        on: '2026-10-12',
      });
      const closeOld = await insertTestExpense(world.database.db, world.checking, {
        cents: 9000,
        on: '2026-10-08',
      });
      const closeNew = await insertTestExpense(world.database.db, world.checking, {
        cents: 11000,
        on: '2026-10-12',
      });

      expect((await candidatesOf(occurrence?.id)).map((item) => item.transactionId)).toEqual([
        closeNew,
        closeOld,
        far,
      ]);
    });

    it('404 OCCURRENCE_NOT_FOUND and 400 for a malformed id', async () => {
      await world.expectError(
        await world.send('GET', `/occurrences/${MISSING}/candidates`),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await world.send('GET', '/occurrences/abc/candidates'),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('PATCH /occurrences/:id', () => {
    it('changes the amount expected this month only and asks the difference again', async () => {
      const { recurrence, occurrence } = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 12990,
        on: '2026-10-10',
      });
      await link(occurrence?.id ?? '', transactionId);
      await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'keep' });

      const response = await world.send('PATCH', `/occurrences/${occurrence?.id}`, {
        expectedAmountCents: 11990,
      });

      const dto = await world.occurrenceOf(response);
      expect(dto).toMatchObject({
        expectedAmountCents: 11990,
        difference: { amountCents: 1000, decision: null },
        needsAttention: true,
      });
      expect((await listOf('2026-11'))[0]?.expectedAmountCents).toBe(10990);
      const row = await world.database.db
        .selectFrom('recurrences')
        .select('expected_amount_cents')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();
      expect(row.expected_amount_cents).toBe(10990);
    });

    it('answers 400 for an amount that is not positive or not whole, and 404; 401 without the token', async () => {
      const { occurrence } = await world.create();

      for (const expectedAmountCents of [0, -1, 10.5]) {
        await world.expectError(
          await world.send('PATCH', `/occurrences/${occurrence?.id}`, { expectedAmountCents }),
          400,
          'VALIDATION_FAILED',
        );
      }
      await world.expectError(
        await world.send('PATCH', `/occurrences/${occurrence?.id}`, {}),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await world.send('PATCH', `/occurrences/${MISSING}`, { expectedAmountCents: 100 }),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await world.send(
          'PATCH',
          `/occurrences/${occurrence?.id}`,
          { expectedAmountCents: 100 },
          { [LOCAL_TOKEN_HEADER]: 'wrong' },
        ),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('settle, unsettle, skip and unskip', () => {
    it('settles by hand: confirmed, nothing left, no difference, no transaction created (Q6)', async () => {
      const { occurrence } = await world.create();
      const before = await world.database.db.selectFrom('transactions').select('id').execute();

      const dto = await world.occurrenceOf(await post(`/occurrences/${occurrence?.id}/settle`));

      expect(dto).toMatchObject({
        status: 'confirmed',
        remainingCents: 0,
        receivedCents: 0,
        difference: null,
        needsAttention: false,
      });
      expect(dto.settledAt).not.toBeNull();
      expect(await world.database.db.selectFrom('transactions').select('id').execute()).toEqual(
        before,
      );
    });

    it('unsettles: back to what the payments and the dates say', async () => {
      const { occurrence } = await world.create();
      await post(`/occurrences/${occurrence?.id}/settle`);

      const dto = await world.occurrenceOf(await post(`/occurrences/${occurrence?.id}/unsettle`));

      expect(dto).toMatchObject({ status: 'late', settledAt: null, needsAttention: true });
    });

    it('409 and 422 of settle and unsettle', async () => {
      const marked = await world.create({ name: 'A' });
      const skipped = await world.create({ name: 'B' });
      const confirmed = await world.create({ name: 'C' });
      await post(`/occurrences/${marked.occurrence?.id}/settle`);
      await post(`/occurrences/${skipped.occurrence?.id}/skip`);
      const payment = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(confirmed.occurrence?.id ?? '', payment);

      await world.expectError(
        await post(`/occurrences/${marked.occurrence?.id}/settle`),
        409,
        'OCCURRENCE_ALREADY_SETTLED',
      );
      await world.expectError(
        await post(`/occurrences/${confirmed.occurrence?.id}/settle`),
        409,
        'OCCURRENCE_ALREADY_SETTLED',
      );
      await world.expectError(
        await post(`/occurrences/${skipped.occurrence?.id}/settle`),
        422,
        'OCCURRENCE_SKIPPED',
      );
      await world.expectError(
        await post(`/occurrences/${confirmed.occurrence?.id}/unsettle`),
        409,
        'OCCURRENCE_NOT_SETTLED',
      );
      await world.expectError(
        await post(`/occurrences/${MISSING}/settle`),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await post(`/occurrences/${MISSING}/unsettle`),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
    });

    it('skips: nothing left, nothing to do, the payments already there stay', async () => {
      const { occurrence } = await world.create({
        expectedAmountCents: 85000,
        maxPayments: 2,
        kind: 'income',
        dateRule: { type: 'any_day' },
      });
      const half = await insertTestIncome(world.database.db, world.checking, {
        cents: 42500,
        on: '2026-10-03',
      });
      await link(occurrence?.id ?? '', half);

      const dto = await world.occurrenceOf(await post(`/occurrences/${occurrence?.id}/skip`));

      expect(dto).toMatchObject({
        status: 'skipped',
        remainingCents: 0,
        needsAttention: false,
        receivedCents: 42500,
      });
      expect(dto.skippedAt).not.toBeNull();
      expect(dto.payments).toHaveLength(1);
    });

    it('unskips: it counts again', async () => {
      const { occurrence } = await world.create();
      await post(`/occurrences/${occurrence?.id}/skip`);

      const dto = await world.occurrenceOf(await post(`/occurrences/${occurrence?.id}/unskip`));

      expect(dto).toMatchObject({ status: 'late', skippedAt: null });
    });

    it('409 of skip and unskip', async () => {
      const skipped = await world.create({ name: 'A' });
      const confirmed = await world.create({ name: 'B' });
      const plain = await world.create({ name: 'C' });
      await post(`/occurrences/${skipped.occurrence?.id}/skip`);
      const payment = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(confirmed.occurrence?.id ?? '', payment);

      await world.expectError(
        await post(`/occurrences/${skipped.occurrence?.id}/skip`),
        409,
        'OCCURRENCE_ALREADY_SKIPPED',
      );
      await world.expectError(
        await post(`/occurrences/${confirmed.occurrence?.id}/skip`),
        409,
        'OCCURRENCE_ALREADY_SETTLED',
      );
      await world.expectError(
        await post(`/occurrences/${plain.occurrence?.id}/unskip`),
        409,
        'OCCURRENCE_NOT_SKIPPED',
      );
      await world.expectError(
        await post(`/occurrences/${MISSING}/skip`),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await post(`/occurrences/${MISSING}/unskip`),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
    });

    it('does not skip one that was marked by hand (confirmed): undo the mark first', async () => {
      const { occurrence } = await world.create();
      await post(`/occurrences/${occurrence?.id}/settle`);

      await world.expectError(
        await post(`/occurrences/${occurrence?.id}/skip`),
        409,
        'OCCURRENCE_ALREADY_SETTLED',
      );
    });

    it('400 for a malformed id and 401 without the token', async () => {
      await world.expectError(await post('/occurrences/abc/settle'), 400, 'VALIDATION_FAILED');
      await world.expectError(
        await world.send('POST', `/occurrences/${MISSING}/skip`, undefined, {
          [LOCAL_TOKEN_HEADER]: 'wrong',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('POST /occurrences/:id/difference (BR-REC-009)', () => {
    const withDifference = async () => {
      const created = await world.create({
        name: 'Plano',
        expectedAmountCents: 21900,
        dateRule: { type: 'fixed_day', day: 20 },
      });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 20000,
        on: '2026-10-20',
      });
      await link(created.occurrence?.id ?? '', transactionId);

      return created;
    };

    it('keeps: only records the answer', async () => {
      const { occurrence, recurrence } = await withDifference();

      const dto = await world.occurrenceOf(
        await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'keep' }),
      );

      expect(dto).toMatchObject({
        expectedAmountCents: 21900,
        difference: { amountCents: -1900, decision: 'kept' },
        needsAttention: false,
      });
      const row = await world.database.db
        .selectFrom('recurrences')
        .select('expected_amount_cents')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();
      expect(row.expected_amount_cents).toBe(21900);
    });

    it('updates: the recurrence and the months ahead take the amount received, this month keeps what it expected', async () => {
      const { occurrence, recurrence } = await withDifference();
      const december = (await listOf('2026-12'))[0];
      await world.send('PATCH', `/occurrences/${december?.id}`, { expectedAmountCents: 30000 });
      const january = (await listOf('2027-01'))[0];
      await post(`/occurrences/${january?.id}/skip`);

      const dto = await world.occurrenceOf(
        await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'update' }),
      );

      expect(dto).toMatchObject({
        expectedAmountCents: 21900,
        receivedCents: 20000,
        difference: { amountCents: -1900, decision: 'updated' },
        needsAttention: false,
      });
      const row = await world.database.db
        .selectFrom('recurrences')
        .select('expected_amount_cents')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();
      expect(row.expected_amount_cents).toBe(20000);
      const months = await world.database.db
        .selectFrom('recurrence_occurrences')
        .select(['month', 'expected_amount_cents'])
        .where('recurrence_id', '=', recurrence.id)
        .orderBy('month')
        .execute();
      // November (untouched) follows; December was edited by hand but has no payment or mark, so it
      // follows too ("daqui para a frente"); January was skipped and stays.
      expect(months.map((month) => month.expected_amount_cents)).toEqual([
        21900, 20000, 20000, 21900,
      ]);
    });

    it('may be answered again: the last answer holds', async () => {
      const { occurrence } = await withDifference();
      await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'keep' });

      const dto = await world.occurrenceOf(
        await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'update' }),
      );

      expect(dto.difference?.decision).toBe('updated');
    });

    it('422 OCCURRENCE_NO_DIFFERENCE when there is none: not confirmed, exact, or marked by hand', async () => {
      const open = await world.create({ name: 'A' });
      const exact = await world.create({ name: 'B' });
      const marked = await world.create({ name: 'C' });
      const payment = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(exact.occurrence?.id ?? '', payment);
      await post(`/occurrences/${marked.occurrence?.id}/settle`);

      for (const created of [open, exact, marked]) {
        await world.expectError(
          await post(`/occurrences/${created.occurrence?.id}/difference`, { decision: 'keep' }),
          422,
          'OCCURRENCE_NO_DIFFERENCE',
        );
      }
    });

    it('an update of a deleted recurrence records the answer and leaves the recurrence alone', async () => {
      const { occurrence, recurrence } = await withDifference();
      await world.send('DELETE', `/recurrences/${recurrence.id}`);

      const dto = await world.occurrenceOf(
        await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'update' }),
      );

      expect(dto.difference?.decision).toBe('updated');
      const row = await world.database.db
        .selectFrom('recurrences')
        .select('expected_amount_cents')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();
      expect(row.expected_amount_cents).toBe(21900);
    });

    it('400 for a decision that is not update or keep, 404 and 401', async () => {
      const { occurrence } = await withDifference();

      await world.expectError(
        await post(`/occurrences/${occurrence?.id}/difference`, { decision: 'maybe' }),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await post(`/occurrences/${occurrence?.id}/difference`, {}),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await post(`/occurrences/${MISSING}/difference`, { decision: 'keep' }),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await world.send(
          'POST',
          `/occurrences/${MISSING}/difference`,
          { decision: 'keep' },
          { [LOCAL_TOKEN_HEADER]: 'wrong' },
        ),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });
});
