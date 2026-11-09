import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sql, type Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMigrator } from '#/database/create-migrator.util.ts';
import type { Database } from '#/database/database.type.ts';
import { migrateToLatest } from '#/database/migrate-to-latest.util.ts';
import { createSqliteClient } from '#/database/sqlite.client.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const BEFORE = '202611091400-scope-tags-to-category';
const THIS_ONE = '202611091500-allow-any-payments-in-recurrences';
const NOW = '2026-11-06T12:00:00.000Z';

// The migration that lets `recurrences.max_payments` be NULL, "Quantas vierem" (PM, 09/11/2026).
// It rebuilds the table, so what matters is that nothing already there is lost or moved.
describe('migration: allow any number of payments in a recurrence', () => {
  let folder: string;
  let db: Kysely<Database>;
  let accountId: string;
  let categoryId: string;

  beforeEach(async () => {
    folder = mkdtempSync(join(tmpdir(), 'fincheck-max-payments-'));
    db = createSqliteClient(join(folder, 'test.db'));
    await createMigrator(db).migrateTo(BEFORE);
    accountId = await insertTestAccount(db);
    categoryId = await insertTestCategory(db, { name: 'Mesada' });
  });

  afterEach(async () => {
    await db.destroy();
    rmSync(folder, { recursive: true, force: true });
  });

  const insertRecurrence = (id: string, maxPayments: number) =>
    sql`insert into recurrences (id, kind, name, expected_amount_cents, amount_mode, counterparty,
          match_text, account_id, method, category_id, date_rule, day, non_business_day_shift,
          employment_regime, is_subscription, service_slug, max_payments, starts_month, paused_at,
          archived_at, created_at, updated_at)
        values (${id}, 'income', ${`Fonte ${id}`}, 127002, 'last_received', 'Pai', 'pai', ${accountId},
          'pix', ${categoryId}, 'fixed_day', 5, 'after', 'other', 0, null, ${maxPayments}, '2026-10',
          null, ${NOW}, ${NOW}, ${NOW})`.execute(db);

  const insertOccurrenceWithPayment = async (recurrenceId: string) => {
    const transactionId = await insertTestTransaction(db, accountId, {
      nature: 'income',
      amount_cents: 42500,
    });
    await sql`insert into recurrence_occurrences (id, recurrence_id, month, expected_on,
          window_start_on, window_end_on, expected_amount_cents, created_at, updated_at)
        values (${`occ-${recurrenceId}`}, ${recurrenceId}, '2026-11', '2026-11-05', '2026-11-01',
          '2026-11-10', 127002, ${NOW}, ${NOW})`.execute(db);
    await sql`insert into occurrence_payments (id, occurrence_id, transaction_id, amount_cents,
          linked_by, created_at)
        values (${`pay-${recurrenceId}`}, ${`occ-${recurrenceId}`}, ${transactionId}, 42500, 'auto',
          ${NOW})`.execute(db);
  };

  const readRecurrences = () =>
    sql<Record<string, unknown>>`select * from recurrences order by id`
      .execute(db)
      .then((result) => result.rows);

  const insertWithMaxPayments = (id: string, value: string) =>
    sql
      .raw(
        `insert into recurrences (id, kind, name, expected_amount_cents, amount_mode, date_rule,
           day, non_business_day_shift, max_payments, starts_month, created_at, updated_at)
         values ('${id}', 'expense', 'X', 1000, 'fixed', 'fixed_day', 5, 'none', ${value}, '2026-11',
           '${NOW}', '${NOW}')`,
      )
      .execute(db);

  const seed = async () => {
    for (const [id, maxPayments] of [
      ['rec-1', 1],
      ['rec-3', 3],
      ['rec-5', 5],
    ] as const) {
      await insertRecurrence(id, maxPayments);
      await insertOccurrenceWithPayment(id);
    }
  };

  it('keeps every recurrence, occurrence and payment exactly as they were', async () => {
    await seed();
    const before = await readRecurrences();
    const occurrencesBefore = await sql`select * from recurrence_occurrences order by id`.execute(
      db,
    );
    const paymentsBefore = await sql`select * from occurrence_payments order by id`.execute(db);

    await migrateToLatest(db);

    expect(before).toHaveLength(3);
    expect(await readRecurrences()).toEqual(before);
    expect((await sql`select * from recurrence_occurrences order by id`.execute(db)).rows).toEqual(
      occurrencesBefore.rows,
    );
    expect((await sql`select * from occurrence_payments order by id`.execute(db)).rows).toEqual(
      paymentsBefore.rows,
    );
    expect((await readRecurrences()).map((row) => row['max_payments'])).toEqual([1, 3, 5]);
    expect((await sql`pragma foreign_key_check`.execute(db)).rows).toEqual([]);
    expect((await sql`pragma foreign_keys`.execute(db)).rows).toEqual([{ foreign_keys: 1 }]);
  });

  it('still cascades the occurrences when a recurrence is deleted, so the keys point to the new table', async () => {
    await seed();

    await migrateToLatest(db);
    await sql`delete from recurrences where id = 'rec-3'`.execute(db);

    expect((await sql`select id from recurrence_occurrences order by id`.execute(db)).rows).toEqual(
      [{ id: 'occ-rec-1' }, { id: 'occ-rec-5' }],
    );
    expect((await sql`select id from occurrence_payments order by id`.execute(db)).rows).toEqual([
      { id: 'pay-rec-1' },
      { id: 'pay-rec-5' },
    ]);
  });

  // The `CREATE TABLE` SQLite keeps for `recurrences`, with the name unquoted and the spaces
  // squeezed, so the same table written two ways compares equal.
  const tableSql = async () => {
    const { rows } = await sql<{ sql: string }>`
      select sql from sqlite_master where type = 'table' and name = 'recurrences'`.execute(db);

    return (rows[0]?.sql ?? '').replaceAll('"', '').replaceAll(/\s+/g, ' ').trim();
  };
  const OLD_MAX_PAYMENTS = 'max_payments INTEGER NOT NULL CHECK (max_payments BETWEEN 1 AND 5)';
  const NEW_MAX_PAYMENTS =
    'max_payments INTEGER CHECK (max_payments IS NULL OR max_payments BETWEEN 1 AND 5)';

  it('changes only the max_payments line of the table: every other column, check and key is the same', async () => {
    const before = await tableSql();
    const indexesBefore = (
      await sql`select name, sql from sqlite_master where tbl_name = 'recurrences' order by name`.execute(
        db,
      )
    ).rows;

    await migrateToLatest(db);

    const after = await tableSql();
    expect(before).toContain(OLD_MAX_PAYMENTS);
    expect(after).toContain(NEW_MAX_PAYMENTS);
    expect(after.replace(NEW_MAX_PAYMENTS, OLD_MAX_PAYMENTS)).toBe(before);
    expect(
      (
        await sql`select name, sql from sqlite_master where tbl_name = 'recurrences' order by name`.execute(
          db,
        )
      ).rows.map((row) => (row as { name: string }).name),
    ).toEqual(indexesBefore.map((row) => (row as { name: string }).name));
  });

  it('undoes it to the exact table it was', async () => {
    const before = await tableSql();
    await migrateToLatest(db);

    await createMigrator(db).migrateDown();

    expect(await tableSql()).toBe(before);
  });

  it('keeps the other checks of the table', async () => {
    await migrateToLatest(db);

    await expect(
      sql`insert into recurrences (id, kind, name, expected_amount_cents, amount_mode, date_rule,
            max_payments, starts_month, created_at, updated_at)
          values ('bad', 'expense', 'X', 1000, 'fixed', 'fixed_day', 1, '2026-11', ${NOW}, ${NOW})`.execute(
        db,
      ),
    ).rejects.toThrow(/CHECK constraint failed/);
    await expect(
      sql`insert into recurrences (id, kind, name, expected_amount_cents, amount_mode, date_rule,
            day, non_business_day_shift, max_payments, starts_month, created_at, updated_at)
          values ('bad', 'expense', 'X', 0, 'fixed', 'fixed_day', 5, 'none', 1, '2026-11', ${NOW}, ${NOW})`.execute(
        db,
      ),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it('accepts NULL as "as many as come", and still refuses 0 and 6', async () => {
    await migrateToLatest(db);

    await insertWithMaxPayments('any', 'null');
    await insertWithMaxPayments('four', '4');
    await expect(insertWithMaxPayments('zero', '0')).rejects.toThrow(/CHECK constraint failed/);
    await expect(insertWithMaxPayments('six', '6')).rejects.toThrow(/CHECK constraint failed/);

    expect(
      (await sql`select id, max_payments from recurrences order by id`.execute(db)).rows,
    ).toEqual([
      { id: 'any', max_payments: null },
      { id: 'four', max_payments: 4 },
    ]);
  });

  it('refuses NULL before it, which is what the old shape was', async () => {
    await expect(insertWithMaxPayments('any', 'null')).rejects.toThrow(
      /NOT NULL constraint failed/,
    );
  });

  it('undoes it: the numbers stay and "as many as come" becomes 5', async () => {
    await seed();
    await migrateToLatest(db);
    await insertWithMaxPayments('any', 'null');
    await insertOccurrenceWithPayment('any');
    const before = await readRecurrences();

    const { error } = await createMigrator(db).migrateDown();

    expect(error).toBeUndefined();
    const migrations = await createMigrator(db).getMigrations();
    expect(migrations.find((migration) => migration.name === THIS_ONE)?.executedAt).toBeUndefined();
    const after = await readRecurrences();
    expect(after).toHaveLength(4);
    expect(after.map((row) => [row['id'], row['max_payments']])).toEqual([
      ['any', 5],
      ['rec-1', 1],
      ['rec-3', 3],
      ['rec-5', 5],
    ]);
    expect(after.map((row) => ({ ...row, max_payments: null }))).toEqual(
      before.map((row) => ({ ...row, max_payments: null })),
    );
    expect(
      (await sql`select count(*) as total from recurrence_occurrences`.execute(db)).rows,
    ).toEqual([{ total: 4 }]);
    expect((await sql`pragma foreign_key_check`.execute(db)).rows).toEqual([]);
    await expect(insertWithMaxPayments('again', 'null')).rejects.toThrow(
      /NOT NULL constraint failed/,
    );
  });
});
