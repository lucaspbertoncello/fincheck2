import { CATEGORY_ICONS } from '@fincheck/shared/categories/category/category.constant.ts';
import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';
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

const MORE_SEED = '202611081000-seed-more-default-categories';
const LUCAS_SEED = '202611091300-seed-lucas-categories';
const TAX_ID = '019a5a00-0000-7000-8000-000000000017';
const ROTATION_ID = '019a5a00-0000-7000-8000-00000000001a';

const NEW_NAMES = ['Rotação entre contas', 'Estádio', 'Maconha', 'Amigos e família', 'Taxas'];

describe('seed of the five categories asked by Lucas', () => {
  let folder: string;
  let db: Kysely<Database>;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'fincheck-seed-'));
    db = createSqliteClient(join(folder, 'test.db'));
  });

  afterEach(async () => {
    await db.destroy();
    rmSync(folder, { recursive: true, force: true });
  });

  const insertByHand = (id: string, kind: 'expense' | 'income', name: string) =>
    db
      .insertInto('categories')
      .values({
        id,
        kind,
        name,
        icon: 'tag',
        is_default: 0,
        archived_at: null,
        created_at: '2026-11-07T10:00:00.000Z',
        updated_at: '2026-11-07T10:00:00.000Z',
      })
      .execute();

  const nameOf = async (id: string) =>
    (await db.selectFrom('categories').select('name').where('id', '=', id).executeTakeFirst())
      ?.name;

  it('creates the five expense categories and renames the tax one', async () => {
    await migrateToLatest(db);

    const rows = await db.selectFrom('categories').selectAll().orderBy('id').execute();
    expect(rows).toHaveLength(30);
    expect(rows.every((row) => row.is_default === 1 && row.archived_at === null)).toBe(true);

    const added = rows.slice(25);
    expect(added.map((row) => [row.name, row.kind, row.icon])).toEqual([
      ['Rotação entre contas', 'expense', 'transfer'],
      ['Estádio', 'expense', 'stadium'],
      ['Maconha', 'expense', 'leaf'],
      ['Amigos e família', 'expense', 'people'],
      ['Taxas', 'expense', 'receipt'],
    ]);
    for (const row of added) {
      expect(idSchema.safeParse(row.id).success).toBe(true);
      expect(CATEGORY_ICONS).toContain(row.icon);
    }
    expect(await nameOf(TAX_ID)).toBe('Impostos');
    expect(rows.some((row) => row.name === 'Impostos e taxas')).toBe(false);
  });

  it('does not repeat a name Lucas already created by hand (no case or accent)', async () => {
    const migrator = createMigrator(db);
    await migrator.migrateTo(MORE_SEED);
    await insertByHand('11111111-1111-7111-8111-111111111111', 'expense', 'estadio');
    await insertByHand('22222222-2222-7222-8222-222222222222', 'expense', 'TAXAS');

    await migrateToLatest(db);

    const rows = await db.selectFrom('categories').select(['kind', 'name']).execute();
    expect(rows).toHaveLength(25 + 2 + 3);
    expect(rows.filter((row) => row.name.toLowerCase() === 'taxas')).toHaveLength(1);
    expect(rows.filter((row) => row.name.toLowerCase() === 'estadio')).toHaveLength(1);
    expect(rows.filter((row) => row.name === 'Estádio')).toHaveLength(0);
  });

  it('marks as a transfer the category Lucas already created with the name of the rotation', async () => {
    const migrator = createMigrator(db);
    await migrator.migrateTo(MORE_SEED);
    await insertByHand('33333333-3333-7333-8333-333333333333', 'expense', 'rotacao ENTRE contas');

    await migrateToLatest(db);

    const rows = await db
      .selectFrom('categories')
      .select(['id', 'name', 'is_transfer'])
      .where('is_transfer', '=', 1)
      .execute();
    expect(rows).toEqual([
      { id: '33333333-3333-7333-8333-333333333333', name: 'rotacao ENTRE contas', is_transfer: 1 },
    ]);
  });

  it('does not rename the tax category when Lucas already changed its name', async () => {
    const migrator = createMigrator(db);
    await migrator.migrateTo(MORE_SEED);
    await db
      .updateTable('categories')
      .set({ name: 'Meus impostos' })
      .where('id', '=', TAX_ID)
      .execute();

    await migrateToLatest(db);

    expect(await nameOf(TAX_ID)).toBe('Meus impostos');
  });

  it('undoes the rename and the inserts, keeping what was made by hand', async () => {
    const migrator = createMigrator(db);
    await migrator.migrateTo(MORE_SEED);
    await insertByHand('11111111-1111-7111-8111-111111111111', 'expense', 'Taxas');
    await migrateToLatest(db);

    const { error } = await migrator.migrateTo(MORE_SEED);

    expect(error).toBeUndefined();
    const names = (await db.selectFrom('categories').select('name').execute()).map(
      (row) => row.name,
    );
    expect(names).toHaveLength(26);
    expect(names).toContain('Taxas');
    expect(names).toContain('Impostos e taxas');
    expect(names).not.toContain('Impostos');
    for (const name of NEW_NAMES.filter((name) => name !== 'Taxas'))
      expect(names).not.toContain(name);
  });

  it('leaves a name Lucas changed alone on undo, and a second run changes nothing', async () => {
    const migrator = createMigrator(db);
    await migrateToLatest(db);
    await db.updateTable('categories').set({ name: 'Tributos' }).where('id', '=', TAX_ID).execute();
    await migrator.migrateTo(MORE_SEED);
    expect(await nameOf(TAX_ID)).toBe('Tributos');

    await migrator.migrateTo(LUCAS_SEED);
    await migrateToLatest(db);

    expect(await db.selectFrom('categories').select('id').execute()).toHaveLength(30);
  });

  describe('the category that is a transfer (is_transfer)', () => {
    it('adds the column with 0 for every category and 1 only for "Rotação entre contas"', async () => {
      await migrateToLatest(db);

      const rows = await db
        .selectFrom('categories')
        .select(['id', 'name', 'is_transfer'])
        .execute();
      expect(rows.filter((row) => row.is_transfer === 1)).toEqual([
        { id: ROTATION_ID, name: 'Rotação entre contas', is_transfer: 1 },
      ]);
      expect(rows.filter((row) => row.is_transfer === 0)).toHaveLength(29);
    });

    it('a category made after the migration is not a transfer by default', async () => {
      await migrateToLatest(db);

      const id = await insertTestCategory(db);

      expect(
        (
          await db
            .selectFrom('categories')
            .select('is_transfer')
            .where('id', '=', id)
            .executeTakeFirst()
        )?.is_transfer,
      ).toBe(0);
    });

    it('lets a transfer keep a category, and still refuses one on the other natures', async () => {
      await migrateToLatest(db);
      const accountId = await insertTestAccount(db);

      await insertTestTransaction(db, accountId, {
        nature: 'transfer',
        category_id: ROTATION_ID,
        category_source: 'user',
      });

      await expect(
        insertTestTransaction(db, accountId, {
          nature: 'invoice_payment',
          category_id: ROTATION_ID,
          category_source: 'user',
        }),
      ).rejects.toThrow();
    });

    it('rebuilds `transactions` without losing rows, links, tags, splits or indexes', async () => {
      const migrator = createMigrator(db);
      await migrator.migrateTo(MORE_SEED);
      const accountId = await insertTestAccount(db);
      const otherAccountId = await insertTestAccount(db);
      // The old shape of `tags` (before the tags belong to a category), and a part in `food`: the
      // tag stays with the split transaction when `scope-tags-to-category` runs after this one.
      const tagId = 'tag-before-scope';
      await sql`insert into tags (id, name, archived_at, created_at, updated_at)
        values (${tagId}, 'promo', null, '2026-11-06T12:00:00.000Z', '2026-11-06T12:00:00.000Z')`.execute(
        db,
      );
      const food = await insertTestCategory(db);
      const first = await insertTestTransaction(db, accountId, {
        nature: 'transfer',
        amount_cents: -5000,
      });
      const second = await insertTestTransaction(db, otherAccountId, {
        nature: 'transfer',
        amount_cents: 5000,
        transfer_counterpart_id: first,
      });
      const split = await insertTestTransaction(db, accountId, { amount_cents: -3000 });
      const categorized = await insertTestTransaction(db, accountId, {
        category_id: food,
        category_source: 'user',
      });
      await db
        .insertInto('transaction_tags')
        .values({ transaction_id: split, tag_id: tagId })
        .execute();
      await db
        .insertInto('transaction_splits')
        .values({
          id: '33333333-3333-7333-8333-333333333333',
          transaction_id: split,
          position: 1,
          amount_cents: -3000,
          nature: 'expense',
          category_id: food,
          description: null,
        })
        .execute();

      await migrateToLatest(db);

      expect(await db.selectFrom('transactions').select('id').execute()).toHaveLength(4);
      const reread = await db
        .selectFrom('transactions')
        .select(['id', 'transfer_counterpart_id', 'category_id'])
        .where('id', 'in', [second, categorized])
        .execute();
      expect(reread.find((row) => row.id === second)?.transfer_counterpart_id).toBe(first);
      expect(reread.find((row) => row.id === categorized)?.category_id).toBe(food);
      expect(await db.selectFrom('transaction_tags').selectAll().execute()).toHaveLength(1);
      expect(await db.selectFrom('transaction_splits').selectAll().execute()).toHaveLength(1);

      const indexes = await sql<{ name: string }>`
        SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'transactions'
      `
        .execute(db)
        .then((result) => result.rows.map((row) => row.name));
      expect(indexes).toEqual(
        expect.arrayContaining([
          'transactions_account_occurred_on_index',
          'transactions_installment_unique',
          'transactions_to_review_index',
        ]),
      );
      const problems = await sql`PRAGMA foreign_key_check`.execute(db);
      expect(problems.rows).toEqual([]);
      const keys = await sql<{ foreign_keys: number }>`PRAGMA foreign_keys`.execute(db);
      expect(keys.rows[0]?.foreign_keys).toBe(1);
    });

    it('undoes the column and the check, taking the category off the transfers first', async () => {
      const migrator = createMigrator(db);
      await migrateToLatest(db);
      const accountId = await insertTestAccount(db);
      const id = await insertTestTransaction(db, accountId, {
        nature: 'transfer',
        category_id: ROTATION_ID,
        category_source: 'user',
      });

      const { error } = await migrator.migrateTo(MORE_SEED);

      expect(error).toBeUndefined();
      const row = await db
        .selectFrom('transactions')
        .select(['nature', 'category_id', 'category_source', 'category_rule_id'])
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      expect(row).toEqual({
        nature: 'transfer',
        category_id: null,
        category_source: null,
        category_rule_id: null,
      });
      const columns = await sql<{ name: string }>`PRAGMA table_info(categories)`
        .execute(db)
        .then((result) => result.rows.map((column) => column.name));
      expect(columns).not.toContain('is_transfer');
      await expect(
        insertTestTransaction(db, accountId, {
          nature: 'transfer',
          category_id: await insertTestCategory(db),
          category_source: 'user',
        }),
      ).rejects.toThrow();
    });
  });
});
