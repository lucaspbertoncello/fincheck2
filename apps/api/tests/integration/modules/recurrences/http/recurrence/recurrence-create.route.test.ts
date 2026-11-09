import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import {
  buildRecurrenceRequest,
  createRecurrenceTestWorld,
} from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';

const MISSING = '01939000-0000-7000-8000-00000000dead';

describe('POST /recurrences', () => {
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

  it('creates the recurrence with the defaults and answers 201 with the occurrence of this month', async () => {
    const { recurrence, occurrence } = await world.create();

    expect(recurrence).toMatchObject({
      kind: 'expense',
      name: 'Academia',
      expectedAmountCents: 10990,
      amountMode: 'fixed',
      maxPayments: 1,
      startsMonth: '2026-10',
      isSubscription: false,
      serviceSlug: null,
      employmentRegime: null,
      counterparty: null,
      matchText: null,
      accountId: null,
      method: null,
      categoryId: null,
      pausedAt: null,
      archivedAt: null,
      dateRule: {
        type: 'fixed_day',
        day: 10,
        businessDayNumber: null,
        toleranceDays: null,
        nonBusinessDayShift: 'none',
      },
    });
    // Born expected, with the day and the window the rule gives; the window of the 10th ended on
    // the 13th, so on the 22nd it is already late.
    expect(occurrence).toMatchObject({
      recurrenceId: recurrence.id,
      recurrenceName: 'Academia',
      month: '2026-10',
      expectedOn: '2026-10-10',
      windowStartOn: '2026-10-07',
      windowEndOn: '2026-10-13',
      expectedAmountCents: 10990,
      receivedCents: 0,
      remainingCents: 10990,
      status: 'late',
      payments: [],
    });
  });

  it('creates the occurrences of the current month and the 3 after it, and no more', async () => {
    await world.create();

    expect((await occurrencesOf('2026-10')).map((item) => item.month)).toContain('2026-10');
    for (const month of ['2026-11', '2026-12', '2027-01']) {
      expect(await occurrencesOf(month)).toHaveLength(1);
    }
    expect(await occurrencesOf('2027-02')).toHaveLength(0);
  });

  it('takes the first month, the amount mode, the parts, the sender text (normalized) and the rest as sent', async () => {
    const categoryId = await insertTestCategory(world.database.db, {
      kind: 'income',
      name: 'Renda teste',
    });
    const { recurrence } = await world.create({
      kind: 'income',
      name: 'Maxxy',
      expectedAmountCents: 420000,
      amountMode: 'last_received',
      counterparty: 'Pix de G. Prado, conta PJ',
      matchText: '  Pix de  G. Prado',
      employmentRegime: 'pj',
      accountId: world.checking,
      method: 'pix',
      categoryId,
      maxPayments: 2,
      startsMonth: '2026-11',
      dateRule: { type: 'around_day', day: 25, toleranceDays: 2 },
    });

    expect(recurrence).toMatchObject({
      kind: 'income',
      amountMode: 'last_received',
      counterparty: 'Pix de G. Prado, conta PJ',
      matchText: 'PIX DE G. PRADO',
      employmentRegime: 'pj',
      accountId: world.checking,
      method: 'pix',
      categoryId,
      maxPayments: 2,
      startsMonth: '2026-11',
      dateRule: { type: 'around_day', day: 25, toleranceDays: 2, nonBusinessDayShift: null },
    });
    // It starts in November: there is nothing in October.
    expect(await occurrencesOf('2026-10')).toHaveLength(0);
    expect(await occurrencesOf('2026-11')).toHaveLength(1);
  });

  it('takes maxPayments null as "as many as come", answers it null and reads it back null', async () => {
    const { recurrence } = await world.create({
      kind: 'income',
      name: 'Mesada + VR',
      dateRule: { type: 'any_day' },
      maxPayments: null,
    });

    expect(recurrence.maxPayments).toBeNull();
    const response = await world.send('GET', `/recurrences/${recurrence.id}`);
    expect(await response.json()).toMatchObject({ id: recurrence.id, maxPayments: null });
    const row = await world.database.db
      .selectFrom('recurrences')
      .select('max_payments')
      .where('id', '=', recurrence.id)
      .executeTakeFirstOrThrow();
    expect(row.max_payments).toBeNull();
  });

  it('answers a null occurrence when the first month is after the current one', async () => {
    const { occurrence } = await world.create({ startsMonth: '2026-12' });

    expect(occurrence).toBeNull();
    expect(await occurrencesOf('2026-11')).toHaveLength(0);
    expect(await occurrencesOf('2026-12')).toHaveLength(1);
  });

  it('answers 401 without the local token', async () => {
    const response = await world.send('POST', '/recurrences', buildRecurrenceRequest(), {
      [LOCAL_TOKEN_HEADER]: 'wrong',
    });

    await world.expectError(response, 401, 'LOCAL_TOKEN_INVALID');
  });

  describe('400 VALIDATION_FAILED', () => {
    const rejects = async (body: unknown, path: string) => {
      const response = await world.send('POST', '/recurrences', body);

      expect(response.status).toBe(400);
      const error = (await response.json()) as {
        code: string;
        details: { issues: { path: string }[] };
      };
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.details.issues.map((issue) => issue.path)).toContain(path);
    };

    it('a body with no date rule', async () => {
      await rejects({ kind: 'expense', name: 'X', expectedAmountCents: 100 }, 'dateRule');
    });

    it.each([
      ['a fixed day with no day', { type: 'fixed_day' }, 'dateRule.day'],
      ['a business day with no number', { type: 'business_day' }, 'dateRule.businessDayNumber'],
      ['around a day with no tolerance', { type: 'around_day', day: 25 }, 'dateRule.toleranceDays'],
      ['any day with a tolerance', { type: 'any_day', toleranceDays: 2 }, 'dateRule.toleranceDays'],
      [
        'a business day with a shift',
        { type: 'business_day', businessDayNumber: 5, nonBusinessDayShift: 'after' },
        'dateRule.nonBusinessDayShift',
      ],
      ['day 32', { type: 'fixed_day', day: 32 }, 'dateRule.day'],
      [
        'a business day above 23',
        { type: 'business_day', businessDayNumber: 24 },
        'dateRule.businessDayNumber',
      ],
      [
        'a tolerance above 15',
        { type: 'around_day', day: 10, toleranceDays: 16 },
        'dateRule.toleranceDays',
      ],
    ])('%s', async (_name, dateRule, path) => {
      await rejects(buildRecurrenceRequest({ dateRule } as never), path);
    });

    it('an amount that is not positive, a name that is empty or too long, parts out of 1 to 5', async () => {
      await rejects(buildRecurrenceRequest({ expectedAmountCents: 0 }), 'expectedAmountCents');
      await rejects(buildRecurrenceRequest({ expectedAmountCents: 10.5 }), 'expectedAmountCents');
      await rejects(buildRecurrenceRequest({ name: '   ' }), 'name');
      await rejects(buildRecurrenceRequest({ name: 'x'.repeat(81) }), 'name');
      await rejects(buildRecurrenceRequest({ maxPayments: 0 }), 'maxPayments');
      await rejects(buildRecurrenceRequest({ maxPayments: 6 }), 'maxPayments');
    });

    it('a subscription that is an income, and a service with no subscription mark', async () => {
      await rejects(
        buildRecurrenceRequest({ kind: 'income', isSubscription: true }),
        'isSubscription',
      );
      await rejects(buildRecurrenceRequest({ serviceSlug: 'netflix' }), 'serviceSlug');
    });

    it('a service that is not on the list of the shared package (Star+ left it)', async () => {
      await rejects(
        buildRecurrenceRequest({ isSubscription: true, serviceSlug: 'starplus' as never }),
        'serviceSlug',
      );
    });

    it('an id that is not a uuid and a first month that is not a month', async () => {
      await rejects(buildRecurrenceRequest({ accountId: 'x' }), 'accountId');
      await rejects(buildRecurrenceRequest({ startsMonth: '2026-13' }), 'startsMonth');
    });

    it('a first month outside 2000 to 2100', async () => {
      await rejects(buildRecurrenceRequest({ startsMonth: '1999-12' }), 'startsMonth');
      await rejects(buildRecurrenceRequest({ startsMonth: '2101-01' }), 'startsMonth');
    });
  });

  describe('the other errors of the contract', () => {
    it('404 ACCOUNT_NOT_FOUND', async () => {
      const response = await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({ accountId: MISSING }),
      );

      await world.expectError(response, 404, 'ACCOUNT_NOT_FOUND');
    });

    it('404 CATEGORY_NOT_FOUND', async () => {
      const response = await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({ categoryId: MISSING }),
      );

      await world.expectError(response, 404, 'CATEGORY_NOT_FOUND');
    });

    it('404 TRANSACTION_NOT_FOUND', async () => {
      const response = await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({ linkTransactionId: MISSING }),
      );

      await world.expectError(response, 404, 'TRANSACTION_NOT_FOUND');
    });

    it('422 RECURRENCE_REGIME_ONLY_FOR_INCOME', async () => {
      const response = await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({ employmentRegime: 'clt' }),
      );

      await world.expectError(response, 422, 'RECURRENCE_REGIME_ONLY_FOR_INCOME');
    });

    it('422 RECURRENCE_CATEGORY_KIND_MISMATCH, an income category on an expense', async () => {
      const categoryId = await insertTestCategory(world.database.db, {
        kind: 'income',
        name: 'Receita teste',
      });

      const response = await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({ categoryId }),
      );

      await world.expectError(response, 422, 'RECURRENCE_CATEGORY_KIND_MISMATCH');
    });

    it.each([
      ['an income recurrence with a debit', 'income', 'expense'],
      ['an expense recurrence with a credit', 'expense', 'income'],
    ] as const)('422 OCCURRENCE_TRANSACTION_KIND_MISMATCH: %s', async (_name, kind, side) => {
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

      const response = await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({ kind, linkTransactionId: transactionId }),
      );

      await world.expectError(response, 422, 'OCCURRENCE_TRANSACTION_KIND_MISMATCH');
    });

    it('422 OCCURRENCE_TRANSACTION_KIND_MISMATCH for a transaction that is ignored or has another nature', async () => {
      const ignored = await insertTestExpense(world.database.db, world.checking, {
        cents: 5000,
        on: '2026-10-10',
        overrides: { ignored_at: '2026-10-11T12:00:00.000Z' },
      });
      const transfer = await insertTestExpense(world.database.db, world.checking, {
        cents: 5000,
        on: '2026-10-10',
        overrides: { nature: 'transfer' },
      });

      for (const linkTransactionId of [ignored, transfer]) {
        const response = await world.send(
          'POST',
          '/recurrences',
          buildRecurrenceRequest({ linkTransactionId }),
        );

        await world.expectError(response, 422, 'OCCURRENCE_TRANSACTION_KIND_MISMATCH');
      }
    });

    it('409 OCCURRENCE_TRANSACTION_ALREADY_LINKED, and nothing is written', async () => {
      const first = await world.create();
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });
      await world.send('POST', `/occurrences/${first.occurrence?.id}/payments`, { transactionId });

      const response = await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({ name: 'Outra', linkTransactionId: transactionId }),
      );

      await world.expectError(response, 409, 'OCCURRENCE_TRANSACTION_ALREADY_LINKED');
      const list = await world.send('GET', '/recurrences?month=2026-10');
      expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1);
    });
  });

  describe('from a transaction (linkTransactionId)', () => {
    it('ties it to the occurrence of its own month and starts the recurrence in that month', async () => {
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
        description: 'Academia Smart',
      });

      const { recurrence, occurrence } = await world.create({
        linkTransactionId: transactionId,
        startsMonth: undefined,
      });

      expect(recurrence.startsMonth).toBe('2026-10');
      expect(occurrence).toMatchObject({
        month: '2026-10',
        status: 'confirmed',
        receivedCents: 10990,
        payments: [
          { transactionId, amountCents: 10990, occurredOn: '2026-10-10', linkedBy: 'user' },
        ],
      });
    });

    it('opens the occurrence of a past month for it (R7) and answers that one', async () => {
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-08-10',
      });

      const { recurrence, occurrence } = await world.create({
        linkTransactionId: transactionId,
        startsMonth: undefined,
      });

      expect(recurrence.startsMonth).toBe('2026-08');
      expect(occurrence).toMatchObject({ month: '2026-08', status: 'confirmed' });
      // The routine still covers the current month and the 3 after it.
      expect(await occurrencesOf('2026-10')).toHaveLength(1);
      const detail = await world.send('GET', `/recurrences/${recurrence.id}`);
      const months = ((await detail.json()) as { history: { month: string }[] }).history.map(
        (item) => item.month,
      );
      expect(months).toEqual(['2026-10', '2026-08']);
    });

    it('lets the amount tied differ from the expected one: it becomes a difference to answer', async () => {
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10000,
        on: '2026-10-10',
      });

      const { occurrence } = await world.create({ linkTransactionId: transactionId });

      expect(occurrence).toMatchObject({
        status: 'confirmed',
        difference: { amountCents: -990, decision: null },
        needsAttention: true,
      });
    });

    it('gives the transaction the category of the recurrence, with the origin recurrence', async () => {
      const categoryId = await insertTestCategory(world.database.db, { name: 'Saúde teste' });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });

      await world.create({ categoryId, linkTransactionId: transactionId });

      const after = await world.send('GET', `/transactions/${transactionId}`);
      expect(await after.json()).toMatchObject({ categoryId, categorySource: 'recurrence' });
    });

    it('does not replace a category that is already there', async () => {
      const mine = await insertTestCategory(world.database.db, { name: 'Minha categoria' });
      const theirs = await insertTestCategory(world.database.db, { name: 'Da recorrência' });
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
        overrides: { category_id: mine, category_source: 'user' },
      });

      await world.create({ categoryId: theirs, linkTransactionId: transactionId });

      const after = await world.send('GET', `/transactions/${transactionId}`);
      expect(await after.json()).toMatchObject({ categoryId: mine, categorySource: 'user' });
    });

    it('takes a first month that is given even when the transaction is of another month', async () => {
      const transactionId = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });

      const { recurrence, occurrence } = await world.create({
        linkTransactionId: transactionId,
        startsMonth: '2026-09',
      });

      expect(recurrence.startsMonth).toBe('2026-09');
      expect(occurrence?.month).toBe('2026-10');
    });
  });
});
