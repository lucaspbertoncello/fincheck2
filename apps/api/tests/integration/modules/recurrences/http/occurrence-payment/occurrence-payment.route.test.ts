import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

const MISSING = '01939000-0000-7000-8000-00000000dead';
const occurrenceListSchema = listResponseSchema(occurrenceDtoSchema);

describe('the payments of an occurrence', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const link = (occurrenceId: string, transactionId: string) =>
    world.send('POST', `/occurrences/${occurrenceId}/payments`, { transactionId });
  const itemOf = async (occurrenceId: string | undefined) => {
    const response = await world.send('GET', '/occurrences?month=2026-10');
    const items = occurrenceListSchema.parse(await response.json()).items;

    return items.find((item) => item.id === occurrenceId);
  };
  const transactionOf = async (id: string) =>
    transactionDtoSchema.parse(await (await world.send('GET', `/transactions/${id}`)).json());

  describe('POST /occurrences/:id/payments', () => {
    it('ties the transaction, answers 201 with the link inside and counts what it is worth', async () => {
      const { occurrence } = await world.create({
        expectedAmountCents: 85000,
        maxPayments: 2,
        kind: 'income',
        dateRule: { type: 'any_day' },
      });
      const first = await insertTestIncome(world.database.db, world.checking, {
        cents: 42500,
        on: '2026-10-03',
      });

      const dto = await world.occurrenceOf(await link(occurrence?.id ?? '', first), 201);

      expect(dto).toMatchObject({
        status: 'partial',
        receivedCents: 42500,
        remainingCents: 42500,
        payments: [
          { transactionId: first, amountCents: 42500, occurredOn: '2026-10-03', linkedBy: 'user' },
        ],
      });
    });

    it('lets a second payment close it: two Pix of R$ 425,00 make R$ 850,00, confirmed with no difference', async () => {
      const { occurrence } = await world.create({
        expectedAmountCents: 85000,
        maxPayments: 2,
        kind: 'income',
        dateRule: { type: 'any_day' },
      });
      const first = await insertTestIncome(world.database.db, world.checking, {
        cents: 42500,
        on: '2026-10-03',
      });
      const second = await insertTestIncome(world.database.db, world.checking, {
        cents: 42500,
        on: '2026-10-20',
      });

      await link(occurrence?.id ?? '', first);
      const dto = await world.occurrenceOf(await link(occurrence?.id ?? '', second), 201);

      expect(dto).toMatchObject({
        status: 'confirmed',
        receivedCents: 85000,
        difference: null,
        needsAttention: false,
      });
      expect(dto.payments.map((payment) => payment.occurredOn)).toEqual([
        '2026-10-03',
        '2026-10-20',
      ]);
    });

    it('accepts a transaction outside the window and one that passes the expected amount', async () => {
      const { occurrence } = await world.create({ dateRule: { type: 'fixed_day', day: 10 } });
      const far = await insertTestExpense(world.database.db, world.checking, {
        cents: 12990,
        on: '2026-08-01',
      });

      const dto = await world.occurrenceOf(await link(occurrence?.id ?? '', far), 201);

      expect(dto).toMatchObject({
        status: 'confirmed',
        receivedCents: 12990,
        difference: { amountCents: 2000, decision: null },
      });
    });

    it('puts the category of the recurrence on a transaction without one, with the origin recurrence', async () => {
      const categoryId = await insertTestCategory(world.database.db, { name: 'Saúde teste' });
      const { occurrence } = await world.create({ categoryId });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });

      await link(occurrence?.id ?? '', transactionId);

      expect(await transactionOf(transactionId)).toMatchObject({
        categoryId,
        categorySource: 'recurrence',
        isInReview: false,
      });
    });

    it('leaves alone a category that is already there and a split transaction', async () => {
      const mine = await insertTestCategory(world.database.db, { name: 'Minha' });
      const theirs = await insertTestCategory(world.database.db, { name: 'Da recorrência' });
      const { occurrence } = await world.create({ categoryId: theirs, maxPayments: 3 });
      const categorized = await insertTestExpense(world.database.db, world.checking, {
        cents: 3000,
        on: '2026-10-10',
        overrides: { category_id: mine, category_source: 'user' },
      });
      const split = await insertTestExpense(world.database.db, world.checking, {
        cents: 3000,
        on: '2026-10-10',
      });
      await world.database.db
        .insertInto('transaction_splits')
        .values([
          {
            id: '019a0000-0000-7000-8000-000000000001',
            transaction_id: split,
            position: 1,
            amount_cents: -1000,
            nature: 'expense',
            category_id: null,
            description: null,
          },
          {
            id: '019a0000-0000-7000-8000-000000000002',
            transaction_id: split,
            position: 2,
            amount_cents: -2000,
            nature: 'expense',
            category_id: null,
            description: null,
          },
        ])
        .execute();

      await link(occurrence?.id ?? '', categorized);
      await link(occurrence?.id ?? '', split);

      expect(await transactionOf(categorized)).toMatchObject({
        categoryId: mine,
        categorySource: 'user',
      });
      expect(await transactionOf(split)).toMatchObject({ categoryId: null });
    });

    it('404 OCCURRENCE_NOT_FOUND and TRANSACTION_NOT_FOUND', async () => {
      const { occurrence } = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });

      await world.expectError(await link(MISSING, transactionId), 404, 'OCCURRENCE_NOT_FOUND');
      await world.expectError(
        await link(occurrence?.id ?? '', MISSING),
        404,
        'TRANSACTION_NOT_FOUND',
      );
    });

    it('409 OCCURRENCE_TRANSACTION_ALREADY_LINKED, to the same occurrence or to another', async () => {
      const first = await world.create({ name: 'A' });
      const second = await world.create({ name: 'B' });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(first.occurrence?.id ?? '', transactionId);

      await world.expectError(
        await link(first.occurrence?.id ?? '', transactionId),
        409,
        'OCCURRENCE_TRANSACTION_ALREADY_LINKED',
      );
      await world.expectError(
        await link(second.occurrence?.id ?? '', transactionId),
        409,
        'OCCURRENCE_TRANSACTION_ALREADY_LINKED',
      );
    });

    it.each([
      ['a credit on an expense', 'expense', 'income'],
      ['a debit on an income', 'income', 'expense'],
    ] as const)('422 OCCURRENCE_TRANSACTION_KIND_MISMATCH: %s', async (_name, kind, side) => {
      const { occurrence } = await world.create({ kind });
      const transactionId =
        side === 'income'
          ? await insertTestIncome(world.database.db, world.checking, {
              cents: 5000,
              on: '2026-10-10',
            })
          : await insertTestExpense(world.database.db, world.checking, {
              cents: 5000,
              on: '2026-10-10',
            });

      await world.expectError(
        await link(occurrence?.id ?? '', transactionId),
        422,
        'OCCURRENCE_TRANSACTION_KIND_MISMATCH',
      );
    });

    it('422 OCCURRENCE_TRANSACTION_KIND_MISMATCH for an ignored one, for a transfer and for a payment of invoice', async () => {
      const { occurrence } = await world.create();
      const ids = [
        await insertTestExpense(world.database.db, world.checking, {
          cents: 5000,
          on: '2026-10-10',
          overrides: { ignored_at: '2026-10-11T12:00:00.000Z' },
        }),
        await insertTestExpense(world.database.db, world.checking, {
          cents: 5000,
          on: '2026-10-10',
          overrides: { nature: 'transfer' },
        }),
        await insertTestExpense(world.database.db, world.checking, {
          cents: 5000,
          on: '2026-10-10',
          overrides: { nature: 'invoice_payment' },
        }),
      ];

      for (const transactionId of ids) {
        await world.expectError(
          await link(occurrence?.id ?? '', transactionId),
          422,
          'OCCURRENCE_TRANSACTION_KIND_MISMATCH',
        );
      }
    });

    it('422 OCCURRENCE_SKIPPED', async () => {
      const { occurrence } = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await world.send('POST', `/occurrences/${occurrence?.id}/skip`);

      await world.expectError(
        await link(occurrence?.id ?? '', transactionId),
        422,
        'OCCURRENCE_SKIPPED',
      );
    });

    it('writes nothing when it is refused: the occurrence keeps its payments', async () => {
      const { occurrence } = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
        overrides: { ignored_at: '2026-10-11T12:00:00.000Z' },
      });

      await link(occurrence?.id ?? '', transactionId);

      const rows = await world.database.db.selectFrom('occurrence_payments').selectAll().execute();
      expect(rows).toEqual([]);
    });

    it('400 for a body without a transaction id, for ids that are not uuids; 401 without the token', async () => {
      const { occurrence } = await world.create();

      await world.expectError(
        await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {}),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(await link('abc', MISSING), 400, 'VALIDATION_FAILED');
      await world.expectError(
        await world.send(
          'POST',
          `/occurrences/${occurrence?.id}/payments`,
          { transactionId: MISSING },
          { [LOCAL_TOKEN_HEADER]: 'wrong' },
        ),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('what a payment is worth: the transaction decides (BR-REC-008)', () => {
    it('counts less when the transaction is ignored, and again when it comes back', async () => {
      const { occurrence } = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(occurrence?.id ?? '', transactionId);

      await world.send('POST', '/transactions/' + transactionId + '/ignore');
      expect(await itemOf(occurrence?.id)).toMatchObject({
        status: 'late',
        receivedCents: 0,
        payments: [],
      });

      await world.send('POST', '/transactions/' + transactionId + '/unignore');
      expect(await itemOf(occurrence?.id)).toMatchObject({
        status: 'confirmed',
        receivedCents: 10990,
      });
    });

    it('counts the new value when the transaction is corrected to less, and never more than was tied', async () => {
      const { occurrence } = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(occurrence?.id ?? '', transactionId);

      await world.send('PATCH', `/transactions/${transactionId}`, { amountCents: 5000 });
      expect((await itemOf(occurrence?.id))?.receivedCents).toBe(5000);

      await world.send('PATCH', `/transactions/${transactionId}`, { amountCents: 20000 });
      expect((await itemOf(occurrence?.id))?.receivedCents).toBe(10990);
    });

    it('loses the payment when the transaction is deleted', async () => {
      const { occurrence } = await world.create();
      const created = await world.send('POST', '/transactions', {
        type: 'expense',
        accountId: world.checking,
        method: 'pix',
        description: 'Academia',
        amountCents: 10990,
        occurredOn: '2026-10-10',
      });
      const transactionId = transactionDtoSchema.parse(await created.json()).id;
      await link(occurrence?.id ?? '', transactionId);

      expect((await world.send('DELETE', `/transactions/${transactionId}`)).status).toBe(204);

      const rows = await world.database.db.selectFrom('occurrence_payments').selectAll().execute();
      expect(rows).toEqual([]);
    });
  });

  describe('the nature of a transaction tied to an occurrence is locked', () => {
    const patch = (id: string, body: unknown) => world.send('PATCH', `/transactions/${id}`, body);

    it('refuses to turn a linked income into a transfer: 422 TRANSACTION_LINKED_TO_OCCURRENCE, and it keeps counting as received', async () => {
      // The reproduction of the review: R$ 1.000,00 received and tied to the occurrence of R$ 1.000,00.
      const { occurrence } = await world.create({
        kind: 'income',
        name: 'Salário',
        expectedAmountCents: 100000,
        dateRule: { type: 'fixed_day', day: 15 },
      });
      const income = await insertTestIncome(world.database.db, world.checking, {
        cents: 100000,
        on: '2026-10-15',
      });
      await link(occurrence?.id ?? '', income);

      await world.expectError(
        await patch(income, { nature: 'transfer' }),
        422,
        'TRANSACTION_LINKED_TO_OCCURRENCE',
      );

      expect(await transactionOf(income)).toMatchObject({ nature: 'income' });
      expect(await itemOf(occurrence?.id)).toMatchObject({
        status: 'confirmed',
        receivedCents: 100000,
      });
    });

    it('refuses the same for a linked expense, and for any change of nature', async () => {
      const { occurrence } = await world.create();
      const expense = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(occurrence?.id ?? '', expense);

      await world.expectError(
        await patch(expense, { nature: 'transfer' }),
        422,
        'TRANSACTION_LINKED_TO_OCCURRENCE',
      );
      expect((await transactionOf(expense)).nature).toBe('expense');
    });

    it('accepts the nature it already has, and the other edits (value, date, note)', async () => {
      const { occurrence } = await world.create();
      const expense = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(occurrence?.id ?? '', expense);

      expect((await patch(expense, { nature: 'expense' })).status).toBe(200);
      expect(
        (await patch(expense, { editNote: 'academia', occurredOn: '2026-10-11' })).status,
      ).toBe(200);
    });

    it('lets the nature change once the link is undone', async () => {
      const { occurrence } = await world.create();
      const expense = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      const linked = await world.occurrenceOf(await link(occurrence?.id ?? '', expense), 201);
      await world.send(
        'DELETE',
        `/occurrences/${occurrence?.id}/payments/${linked.payments[0]?.id}`,
      );

      expect((await patch(expense, { nature: 'transfer' })).status).toBe(200);
    });

    it('refuses to take a linked transaction as the other leg of a transfer, and writes nothing', async () => {
      const { occurrence } = await world.create();
      const savings = await insertTestAccount(world.database.db, { name: 'Poupança' });
      const expense = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await link(occurrence?.id ?? '', expense);
      const credit = await insertTestIncome(world.database.db, savings, {
        cents: 10990,
        on: '2026-10-10',
      });

      const response = await patch(credit, { nature: 'transfer', transferCounterpartId: expense });

      await world.expectError(response, 422, 'TRANSACTION_LINKED_TO_OCCURRENCE');
      expect((await transactionOf(expense)).nature).toBe('expense');
      expect((await transactionOf(credit)).nature).toBe('income');
    });
  });

  describe('DELETE /occurrences/:id/payments/:paymentId', () => {
    it('unties: 204, the occurrence goes back, the category of the recurrence stays on the transaction', async () => {
      const categoryId = await insertTestCategory(world.database.db, { name: 'Saúde teste' });
      const { occurrence } = await world.create({ categoryId });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      const linked = await world.occurrenceOf(await link(occurrence?.id ?? '', transactionId), 201);

      const response = await world.send(
        'DELETE',
        `/occurrences/${occurrence?.id}/payments/${linked.payments[0]?.id}`,
      );

      expect(response.status).toBe(204);
      const rows = await world.database.db.selectFrom('occurrence_payments').selectAll().execute();
      expect(rows).toEqual([]);
      expect(await transactionOf(transactionId)).toMatchObject({
        categoryId,
        categorySource: 'recurrence',
        links: { occurrence: null },
      });
    });

    it('asks the difference again and lets the transaction be tied again', async () => {
      const { occurrence } = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 12990,
        on: '2026-10-10',
      });
      const linked = await world.occurrenceOf(await link(occurrence?.id ?? '', transactionId), 201);
      await world.send('POST', `/occurrences/${occurrence?.id}/difference`, { decision: 'keep' });

      await world.send(
        'DELETE',
        `/occurrences/${occurrence?.id}/payments/${linked.payments[0]?.id}`,
      );
      const again = await world.occurrenceOf(await link(occurrence?.id ?? '', transactionId), 201);

      expect(again.difference).toEqual({ amountCents: 2000, decision: null });
    });

    it('404 OCCURRENCE_PAYMENT_NOT_FOUND for a payment that does not exist or belongs to another occurrence', async () => {
      const first = await world.create({ name: 'A' });
      const second = await world.create({ name: 'B' });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      const linked = await world.occurrenceOf(
        await link(first.occurrence?.id ?? '', transactionId),
        201,
      );

      await world.expectError(
        await world.send('DELETE', `/occurrences/${first.occurrence?.id}/payments/${MISSING}`),
        404,
        'OCCURRENCE_PAYMENT_NOT_FOUND',
      );
      await world.expectError(
        await world.send(
          'DELETE',
          `/occurrences/${second.occurrence?.id}/payments/${linked.payments[0]?.id}`,
        ),
        404,
        'OCCURRENCE_PAYMENT_NOT_FOUND',
      );
      expect(
        await world.database.db.selectFrom('occurrence_payments').selectAll().execute(),
      ).toHaveLength(1);
    });

    it('404 OCCURRENCE_NOT_FOUND, 400 for malformed ids, 401 without the token', async () => {
      await world.expectError(
        await world.send('DELETE', `/occurrences/${MISSING}/payments/${MISSING}`),
        404,
        'OCCURRENCE_NOT_FOUND',
      );
      await world.expectError(
        await world.send('DELETE', `/occurrences/abc/payments/${MISSING}`),
        400,
        'VALIDATION_FAILED',
      );
      await world.expectError(
        await world.send('DELETE', `/occurrences/${MISSING}/payments/${MISSING}`, undefined, {
          [LOCAL_TOKEN_HEADER]: 'wrong',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('a source that follows the last amount received (BR-REC-014)', () => {
    it('takes the amount received the moment the occurrence is confirmed, with no answer to ask', async () => {
      const { recurrence, occurrence } = await world.create({
        kind: 'income',
        name: 'Freela',
        amountMode: 'last_received',
        expectedAmountCents: 100000,
        dateRule: { type: 'any_day' },
      });
      const transactionId = await insertTestIncome(world.database.db, world.checking, {
        cents: 90000,
        on: '2026-10-10',
      });

      const dto = await world.occurrenceOf(await link(occurrence?.id ?? '', transactionId), 201);

      expect(dto).toMatchObject({
        status: 'confirmed',
        difference: { amountCents: -10000, decision: 'updated' },
        needsAttention: false,
      });
      const row = await world.database.db
        .selectFrom('recurrences')
        .select('expected_amount_cents')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();
      expect(row.expected_amount_cents).toBe(90000);
      const months = await world.database.db
        .selectFrom('recurrence_occurrences')
        .select(['month', 'expected_amount_cents'])
        .where('recurrence_id', '=', recurrence.id)
        .orderBy('month')
        .execute();
      // This month keeps what it expected; the ones after take the amount received.
      expect(months.map((row) => row.expected_amount_cents)).toEqual([100000, 90000, 90000, 90000]);
    });
  });
});
