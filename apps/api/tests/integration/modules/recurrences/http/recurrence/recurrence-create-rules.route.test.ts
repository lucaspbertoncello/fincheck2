import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';

describe('the rules of a new recurrence', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  // The body the screen sends without a first month. Today is 22/10/2026.
  const created = async (
    dateRule: Record<string, unknown>,
    extra: Record<string, unknown> = {},
    request = world.send,
  ) => {
    const response = await request('POST', '/recurrences', {
      kind: 'expense',
      name: 'Academia',
      expectedAmountCents: 10990,
      dateRule,
      ...extra,
    });
    expect(response.status).toBe(201);

    return (await response.json()) as {
      recurrence: { id: string; startsMonth: string };
      occurrence: { month: string; status: string } | null;
    };
  };
  const monthsOf = async (recurrenceId: string) =>
    (
      await world.database.db
        .selectFrom('recurrence_occurrences')
        .select('month')
        .where('recurrence_id', '=', recurrenceId)
        .orderBy('month')
        .execute()
    ).map((row) => row.month);

  describe('the first month when none is given', () => {
    it('starts next month when the window of this month has already closed (a day that passed)', async () => {
      // The window of the 10th was 07 to 13 October: born late. It starts in November instead.
      const { recurrence, occurrence } = await created({ type: 'fixed_day', day: 10 });

      expect(recurrence.startsMonth).toBe('2026-11');
      expect(occurrence).toBeNull();
      expect(await monthsOf(recurrence.id)).toEqual(['2026-11', '2026-12', '2027-01']);
    });

    it('starts this month when the window is still open, today included', async () => {
      expect((await created({ type: 'fixed_day', day: 25 })).recurrence.startsMonth).toBe(
        '2026-10',
      );
      // The window of the 19th is 16 to 22 October: it ends today, which still counts.
      expect((await created({ type: 'fixed_day', day: 19 })).recurrence.startsMonth).toBe(
        '2026-10',
      );
      expect((await created({ type: 'fixed_day', day: 18 })).recurrence.startsMonth).toBe(
        '2026-11',
      );
      expect((await created({ type: 'any_day' })).recurrence.startsMonth).toBe('2026-10');
      expect(
        (await created({ type: 'around_day', day: 25, toleranceDays: 2 })).recurrence.startsMonth,
      ).toBe('2026-10');
    });

    it('reads the closing of the window of each kind of rule: the 5th business day ends on 10/10', async () => {
      const { recurrence } = await created({ type: 'business_day', businessDayNumber: 5 });

      expect(recurrence.startsMonth).toBe('2026-11');
    });

    it('follows the day in São Paulo: at 23:59 of 13/10 the window of the 10th is still open, at 00:00 it closed', async () => {
      const lastMinute = await created(
        { type: 'fixed_day', day: 10 },
        {},
        world.at('2026-10-14T02:59:00.000Z'),
      );
      const midnight = await created(
        { type: 'fixed_day', day: 10 },
        {},
        world.at('2026-10-14T03:00:00.000Z'),
      );

      expect(lastMinute.recurrence.startsMonth).toBe('2026-10');
      expect(midnight.recurrence.startsMonth).toBe('2026-11');
    });

    it('turns the year: a day of December that passed starts in January', async () => {
      const { recurrence } = await created(
        { type: 'fixed_day', day: 5 },
        {},
        world.at('2026-12-20T15:00:00.000Z'),
      );

      expect(recurrence.startsMonth).toBe('2027-01');
    });

    it('keeps the first month that came, even when its window has closed (born late)', async () => {
      const { recurrence, occurrence } = await created(
        { type: 'fixed_day', day: 10 },
        { startsMonth: '2026-10' },
      );

      expect(recurrence.startsMonth).toBe('2026-10');
      expect(occurrence).toMatchObject({ month: '2026-10', status: 'late' });
    });

    it('keeps the month of the transaction it was born from, a past one or this one', async () => {
      const past = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-08-10',
      });
      const thisMonth = await insertTestExpense(world.database.db, world.checking, {
        cents: 10990,
        on: '2026-10-10',
      });

      const fromPast = await created({ type: 'fixed_day', day: 10 }, { linkTransactionId: past });
      const fromThisMonth = await created(
        { type: 'fixed_day', day: 10 },
        { linkTransactionId: thisMonth },
      );

      expect(fromPast.recurrence.startsMonth).toBe('2026-08');
      expect(fromThisMonth.recurrence.startsMonth).toBe('2026-10');
      expect(fromThisMonth.occurrence).toMatchObject({ month: '2026-10', status: 'confirmed' });
    });
  });

  describe('an archived account (ACCOUNT_ARCHIVED)', () => {
    const archive = (accountId: string) =>
      world.database.db
        .updateTable('accounts')
        .set({ archived_at: '2026-10-01T12:00:00.000Z' })
        .where('id', '=', accountId)
        .execute();

    it('refuses to create a recurrence in it: 422, and nothing is written', async () => {
      const accountId = await insertTestAccount(world.database.db, { name: 'Antiga' });
      await archive(accountId);

      const response = await world.send('POST', '/recurrences', {
        kind: 'expense',
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'any_day' },
        accountId,
      });

      await world.expectError(response, 422, 'ACCOUNT_ARCHIVED');
      expect(await world.database.db.selectFrom('recurrences').selectAll().execute()).toEqual([]);
    });

    it('refuses to move a recurrence to it, and leaves the recurrence as it was', async () => {
      const { recurrence } = await world.create({ accountId: world.checking });
      const archived = await insertTestAccount(world.database.db, { name: 'Antiga' });
      await archive(archived);

      const response = await world.send('PATCH', `/recurrences/${recurrence.id}`, {
        accountId: archived,
      });

      await world.expectError(response, 422, 'ACCOUNT_ARCHIVED');
      const row = await world.database.db
        .selectFrom('recurrences')
        .select('account_id')
        .where('id', '=', recurrence.id)
        .executeTakeFirstOrThrow();
      expect(row.account_id).toBe(world.checking);
    });

    it('lets a recurrence that already lived there be edited, even sending the same account', async () => {
      const accountId = await insertTestAccount(world.database.db, { name: 'Vai arquivar' });
      const { recurrence } = await world.create({ accountId });
      await archive(accountId);

      const rename = await world.send('PATCH', `/recurrences/${recurrence.id}`, { name: 'Outra' });
      const same = await world.send('PATCH', `/recurrences/${recurrence.id}`, {
        accountId,
        expectedAmountCents: 12000,
      });

      expect((await world.recurrenceOf(rename)).name).toBe('Outra');
      expect((await world.recurrenceOf(same)).expectedAmountCents).toBe(12000);
    });

    it('still answers 404 for an account that does not exist, before anything else', async () => {
      const response = await world.send('POST', '/recurrences', {
        kind: 'expense',
        name: 'X',
        expectedAmountCents: 100,
        dateRule: { type: 'any_day' },
        accountId: '01939000-0000-7000-8000-00000000dead',
      });

      await world.expectError(response, 404, 'ACCOUNT_NOT_FOUND');
    });
  });
});
