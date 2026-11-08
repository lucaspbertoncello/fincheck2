import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import { KyselyOccurrenceRepository } from '#/modules/recurrences/infra/occurrence/occurrence.repository.ts';
import { KyselyRecurrenceRepository } from '#/modules/recurrences/infra/recurrence/recurrence.repository.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';

const NOW = '2026-10-22T15:00:00.000Z';

describe('KyselyOccurrenceRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let recurrences: KyselyRecurrenceRepository;
  let occurrences: KyselyOccurrenceRepository;
  let account: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    recurrences = new KyselyRecurrenceRepository(database.db);
    occurrences = new KyselyOccurrenceRepository(database.db);
    account = await insertTestAccount(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const makeRecurrence = async (name = 'Academia') => {
    const recurrence = Recurrence.create(
      {
        kind: 'expense',
        name,
        expectedAmount: Money.fromCents(10990),
        dateRule: DateRule.create({ type: 'any_day' }),
        startsMonth: Month.of('2026-10'),
      },
      NOW,
    );
    await recurrences.save(recurrence);

    return recurrence;
  };
  const makeOccurrence = (recurrenceId: string, month: string) =>
    Occurrence.open(
      {
        recurrenceId,
        month: Month.of(month),
        expectedAmount: Money.fromCents(10990),
        window: {
          expectedOn: null,
          windowStartOn: Month.of(month).firstDay(),
          windowEndOn: Month.of(month).lastDay(),
        },
      },
      NOW,
    );

  it('writes and reads an occurrence with its payments, as it was', async () => {
    const recurrence = await makeRecurrence();
    const transactionId = await insertTestExpense(database.db, account, {
      cents: 5000,
      on: '2026-10-05',
    });
    const occurrence = makeOccurrence(recurrence.id, '2026-10');
    occurrence.link({ transactionId, amount: Money.fromCents(5000), linkedBy: 'user' }, NOW);
    occurrence.differenceDecision = 'kept';
    occurrence.settledAt = '2026-10-23T10:00:00.000Z';

    await occurrences.save(occurrence);
    const read = await occurrences.findById(occurrence.id);

    expect(read).toMatchObject({
      id: occurrence.id,
      recurrenceId: recurrence.id,
      differenceDecision: 'kept',
      settledAt: '2026-10-23T10:00:00.000Z',
      skippedAt: null,
    });
    expect(read?.month.value).toBe('2026-10');
    expect(read?.expectedOn).toBeNull();
    expect(read?.windowEndOn.value).toBe('2026-10-31');
    expect(read?.expectedAmount.cents).toBe(10990);
    expect(read?.payments).toHaveLength(1);
    expect(read?.payments[0]).toMatchObject({ transactionId, linkedBy: 'user', createdAt: NOW });
    expect(read?.payments[0]?.amount.cents).toBe(5000);
  });

  it('replaces the payments on save: an unlinked one is gone, a kept one keeps its id', async () => {
    const recurrence = await makeRecurrence();
    const first = await insertTestExpense(database.db, account, { cents: 100, on: '2026-10-05' });
    const second = await insertTestExpense(database.db, account, { cents: 200, on: '2026-10-06' });
    const occurrence = makeOccurrence(recurrence.id, '2026-10');
    const kept = occurrence.link(
      { transactionId: first, amount: Money.fromCents(100), linkedBy: 'user' },
      NOW,
    );
    const dropped = occurrence.link(
      { transactionId: second, amount: Money.fromCents(200), linkedBy: 'user' },
      NOW,
    );
    await occurrences.save(occurrence);

    occurrence.unlink(dropped.id, NOW);
    await occurrences.save(occurrence);

    const read = await occurrences.findById(occurrence.id);
    expect(read?.payments.map((payment) => payment.id)).toEqual([kept.id]);
  });

  describe('insertMissing', () => {
    it('inserts the ones that do not exist and never duplicates (recurrence and month are unique)', async () => {
      const recurrence = await makeRecurrence();

      const first = await occurrences.insertMissing([
        makeOccurrence(recurrence.id, '2026-10'),
        makeOccurrence(recurrence.id, '2026-11'),
      ]);
      const again = await occurrences.insertMissing([
        makeOccurrence(recurrence.id, '2026-10'),
        makeOccurrence(recurrence.id, '2026-11'),
        makeOccurrence(recurrence.id, '2026-12'),
      ]);

      expect(first).toBe(2);
      expect(again).toBe(1);
      const rows = await database.db
        .selectFrom('recurrence_occurrences')
        .select('month')
        .orderBy('month')
        .execute();
      expect(rows.map((row) => row.month)).toEqual(['2026-10', '2026-11', '2026-12']);
    });

    it('does not overwrite the one that exists', async () => {
      const recurrence = await makeRecurrence();
      const original = makeOccurrence(recurrence.id, '2026-10');
      original.skippedAt = NOW;
      await occurrences.save(original);

      await occurrences.insertMissing([makeOccurrence(recurrence.id, '2026-10')]);

      const read = await occurrences.findByIds([original.id]);
      expect(read[0]?.skippedAt).toBe(NOW);
      expect(
        await database.db.selectFrom('recurrence_occurrences').selectAll().execute(),
      ).toHaveLength(1);
    });

    it('does nothing with an empty list', async () => {
      expect(await occurrences.insertMissing([])).toBe(0);
    });
  });

  it('finds by months, by recurrence (all months or some) and the recent ones of a recurrence newest first', async () => {
    const a = await makeRecurrence('A');
    const b = await makeRecurrence('B');
    for (const month of ['2026-08', '2026-09', '2026-10', '2026-11']) {
      await occurrences.save(makeOccurrence(a.id, month));
    }
    await occurrences.save(makeOccurrence(b.id, '2026-10'));

    expect(await occurrences.findByMonths([Month.of('2026-10')])).toHaveLength(2);
    expect(await occurrences.findByRecurrenceIds([a.id])).toHaveLength(4);
    expect(await occurrences.findByRecurrenceIds([a.id, b.id], [Month.of('2026-10')])).toHaveLength(
      2,
    );
    expect(await occurrences.findByRecurrenceIds([], undefined)).toEqual([]);
    expect(await occurrences.findByRecurrenceIds([a.id], [])).toEqual([]);
    const recent = await occurrences.findRecentByRecurrence(a.id, Month.of('2026-10'), 2);
    expect(recent.map((item) => item.month.value)).toEqual(['2026-10', '2026-09']);
  });

  it('finds the ones that may still ask for action: the months asked, recurrence alive and not paused, no mark', async () => {
    const alive = await makeRecurrence('Viva');
    const deleted = await makeRecurrence('Excluída');
    deleted.archive(NOW);
    await recurrences.save(deleted);
    const paused = await makeRecurrence('Pausada');
    paused.pause(NOW);
    await recurrences.save(paused);
    const old = makeOccurrence(alive.id, '2026-08');
    const skipped = makeOccurrence(alive.id, '2026-07');
    skipped.skippedAt = NOW;
    const settled = makeOccurrence(alive.id, '2026-06');
    settled.settledAt = NOW;
    for (const occurrence of [
      old,
      skipped,
      settled,
      makeOccurrence(alive.id, '2026-10'),
      makeOccurrence(deleted.id, '2026-08'),
      makeOccurrence(paused.id, '2026-08'),
      // Before the first month asked.
      makeOccurrence(alive.id, '2026-05'),
    ]) {
      await occurrences.save(occurrence);
    }

    const pending = await occurrences.findPendingBefore({
      since: Month.of('2026-07'),
      before: Month.of('2026-10'),
    });

    expect(pending.map((item) => item.id)).toEqual([old.id]);
  });

  it('finds the open ones for the match: alive and unpaused, no mark, the window begun by the day', async () => {
    const alive = await makeRecurrence('Viva');
    const paused = await makeRecurrence('Pausada');
    paused.pause(NOW);
    await recurrences.save(paused);
    const open = makeOccurrence(alive.id, '2026-10');
    const notBegun = makeOccurrence(alive.id, '2026-11');
    const marked = makeOccurrence(alive.id, '2026-09');
    marked.skippedAt = NOW;
    for (const occurrence of [open, notBegun, marked, makeOccurrence(paused.id, '2026-10')]) {
      await occurrences.save(occurrence);
    }

    const found = await occurrences.findOpenForMatching('2026-10-15');

    expect(found.map((item) => item.id)).toEqual([open.id]);
    expect(BusinessDate.of('2026-10-15').isBefore(notBegun.windowStartOn)).toBe(true);
  });

  it('tells which transactions are linked, and which only to a recurrence that is alive', async () => {
    const alive = await makeRecurrence('Viva');
    const deleted = await makeRecurrence('Excluída');
    const liveTransaction = await insertTestExpense(database.db, account, {
      cents: 1,
      on: '2026-10-05',
    });
    const deletedTransaction = await insertTestExpense(database.db, account, {
      cents: 2,
      on: '2026-10-05',
    });
    const free = await insertTestExpense(database.db, account, { cents: 3, on: '2026-10-05' });
    const ofAlive = makeOccurrence(alive.id, '2026-10');
    ofAlive.link(
      { transactionId: liveTransaction, amount: Money.fromCents(1), linkedBy: 'auto' },
      NOW,
    );
    const ofDeleted = makeOccurrence(deleted.id, '2026-10');
    ofDeleted.link(
      { transactionId: deletedTransaction, amount: Money.fromCents(2), linkedBy: 'user' },
      NOW,
    );
    await occurrences.save(ofAlive);
    await occurrences.save(ofDeleted);
    deleted.archive(NOW);
    await recurrences.save(deleted);
    const ids = [liveTransaction, deletedTransaction, free];

    expect([...(await occurrences.findLinkedTransactionIds(ids))].toSorted()).toEqual(
      [liveTransaction, deletedTransaction].toSorted(),
    );
    expect([...(await occurrences.findLiveLinkedTransactionIds(ids))]).toEqual([liveTransaction]);
    expect(
      (await occurrences.findByLinkedTransactionIds(ids)).map((item) => item.id).toSorted(),
    ).toEqual([ofAlive.id, ofDeleted.id].toSorted());
    expect(await occurrences.findLinkedTransactionIds([])).toEqual(new Set());
  });

  it('removes the payments with the occurrence, and the occurrences with the recurrence (CASCADE)', async () => {
    const recurrence = await makeRecurrence();
    const transactionId = await insertTestExpense(database.db, account, {
      cents: 1,
      on: '2026-10-05',
    });
    const occurrence = makeOccurrence(recurrence.id, '2026-10');
    occurrence.link({ transactionId, amount: Money.fromCents(1), linkedBy: 'user' }, NOW);
    await occurrences.save(occurrence);

    await occurrences.deleteByIds([occurrence.id]);

    expect(await database.db.selectFrom('occurrence_payments').selectAll().execute()).toEqual([]);
    expect(await occurrences.findById(occurrence.id)).toBeNull();

    const other = makeOccurrence(recurrence.id, '2026-11');
    await occurrences.save(other);
    await database.db.deleteFrom('recurrences').where('id', '=', recurrence.id).execute();
    expect(await occurrences.findById(other.id)).toBeNull();
  });

  it('removes the payment when the transaction is deleted (CASCADE)', async () => {
    const recurrence = await makeRecurrence();
    const transactionId = await insertTestExpense(database.db, account, {
      cents: 1,
      on: '2026-10-05',
    });
    const occurrence = makeOccurrence(recurrence.id, '2026-10');
    occurrence.link({ transactionId, amount: Money.fromCents(1), linkedBy: 'user' }, NOW);
    await occurrences.save(occurrence);

    await database.db.deleteFrom('transactions').where('id', '=', transactionId).execute();

    expect((await occurrences.findById(occurrence.id))?.payments).toEqual([]);
  });

  it('keeps one transaction on one occurrence only (unique), whatever the code does', async () => {
    const recurrence = await makeRecurrence();
    const transactionId = await insertTestExpense(database.db, account, {
      cents: 1,
      on: '2026-10-05',
    });
    const first = makeOccurrence(recurrence.id, '2026-10');
    first.link({ transactionId, amount: Money.fromCents(1), linkedBy: 'user' }, NOW);
    await occurrences.save(first);
    const second = makeOccurrence(recurrence.id, '2026-11');
    second.link({ transactionId, amount: Money.fromCents(1), linkedBy: 'user' }, NOW);

    await expect(occurrences.save(second)).rejects.toThrow();
  });
});
