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

const BEFORE = '202611081000-seed-more-default-categories';
const NOW = '2026-11-06T12:00:00.000Z';

// The migration that makes every tag belong to one category (PM rule 5 of 09/11/2026): the old tags
// are loose, so each one goes to the category most used by the transactions that have it.
describe('migration: scope the tags to a category', () => {
  let folder: string;
  let db: Kysely<Database>;
  let accountId: string;

  beforeEach(async () => {
    folder = mkdtempSync(join(tmpdir(), 'fincheck-tags-'));
    db = createSqliteClient(join(folder, 'test.db'));
    await createMigrator(db).migrateTo(BEFORE);
    accountId = await insertTestAccount(db);
  });

  afterEach(async () => {
    await db.destroy();
    rmSync(folder, { recursive: true, force: true });
  });

  // The old shape of `tags`: no category.
  const insertOldTag = async (id: string, name: string, archivedAt: string | null = null) => {
    await sql`insert into tags (id, name, archived_at, created_at, updated_at)
      values (${id}, ${name}, ${archivedAt}, ${NOW}, ${NOW})`.execute(db);
  };

  const tagTransaction = async (transactionId: string, tagId: string) => {
    await sql`insert into transaction_tags (transaction_id, tag_id) values (${transactionId}, ${tagId})`.execute(
      db,
    );
  };

  const newTransaction = (categoryId: string | null) =>
    insertTestTransaction(db, accountId, { category_id: categoryId });

  const insertRule = async (id: string, categoryId: string | null, tagIds: string[]) => {
    await sql`insert into category_rules (id, description_contains, category_id, enabled, created_at, updated_at)
      values (${id}, 'PADARIA', ${categoryId}, 1, ${NOW}, ${NOW})`.execute(db);
    for (const tagId of tagIds) {
      await sql`insert into category_rule_tags (rule_id, tag_id) values (${id}, ${tagId})`.execute(
        db,
      );
    }
  };

  const tagRows = async () =>
    (
      await db.selectFrom('tags').select(['id', 'name', 'category_id']).orderBy('name').execute()
    ).map((row) => `${row.name}:${row.category_id}`);

  const tagIdsOf = async (transactionId: string) =>
    (
      await db
        .selectFrom('transaction_tags')
        .select('tag_id')
        .where('transaction_id', '=', transactionId)
        .execute()
    ).map((row) => row.tag_id);

  it('puts each tag in the category most used by the transactions that have it', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await insertOldTag('tag-1', 'promo');
    for (const categoryId of [food, food, home]) {
      await tagTransaction(await newTransaction(categoryId), 'tag-1');
    }

    await migrateToLatest(db);

    expect(await tagRows()).toEqual([`promo:${food}`]);
  });

  it('breaks a tie by the category with the smaller name in alphabetical order', async () => {
    const zeta = await insertTestCategory(db, { name: 'Zeta' });
    const alfa = await insertTestCategory(db, { name: 'Árvores' });
    await insertOldTag('tag-1', 'tie');
    await tagTransaction(await newTransaction(zeta), 'tag-1');
    await tagTransaction(await newTransaction(alfa), 'tag-1');

    await migrateToLatest(db);

    expect(await tagRows()).toEqual([`tie:${alfa}`]);
  });

  it('deletes a tag that has no transaction, and its links in rules', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    await insertOldTag('tag-unused', 'unused');
    await insertRule('rule-1', food, ['tag-unused']);

    await migrateToLatest(db);

    expect(await tagRows()).toEqual([]);
    expect(await db.selectFrom('category_rule_tags').selectAll().execute()).toEqual([]);
    expect(await db.selectFrom('category_rules').select('id').execute()).toEqual([
      { id: 'rule-1' },
    ]);
  });

  it('deletes a tag whose transactions have no category at all', async () => {
    await insertOldTag('tag-1', 'uncategorized');
    const transactionId = await newTransaction(null);
    await tagTransaction(transactionId, 'tag-1');

    await migrateToLatest(db);

    expect(await tagRows()).toEqual([]);
    expect(await tagIdsOf(transactionId)).toEqual([]);
  });

  it('takes the tag off the transactions that stay in another category or have none', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await insertOldTag('tag-1', 'promo');
    const kept = [await newTransaction(food), await newTransaction(food)];
    const other = await newTransaction(home);
    const none = await newTransaction(null);
    for (const id of [...kept, other, none]) await tagTransaction(id, 'tag-1');

    await migrateToLatest(db);

    expect(await tagIdsOf(kept[0] as string)).toEqual(['tag-1']);
    expect(await tagIdsOf(kept[1] as string)).toEqual(['tag-1']);
    expect(await tagIdsOf(other)).toEqual([]);
    expect(await tagIdsOf(none)).toEqual([]);
  });

  it('keeps the other tags of a transaction when only one is dropped', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await insertOldTag('tag-a', 'a');
    await insertOldTag('tag-b', 'b');
    const mixed = await newTransaction(home);
    await tagTransaction(mixed, 'tag-a');
    await tagTransaction(mixed, 'tag-b');
    await tagTransaction(await newTransaction(food), 'tag-a');
    await tagTransaction(await newTransaction(food), 'tag-a');
    await tagTransaction(await newTransaction(home), 'tag-b');

    await migrateToLatest(db);

    expect(await tagIdsOf(mixed)).toEqual(['tag-b']);
  });

  it('keeps an archived tag archived, with its category', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    await insertOldTag('tag-1', 'old', '2026-11-01T00:00:00.000Z');
    await tagTransaction(await newTransaction(food), 'tag-1');

    await migrateToLatest(db);

    const row = await db.selectFrom('tags').selectAll().executeTakeFirstOrThrow();
    expect(row.category_id).toBe(food);
    expect(row.archived_at).toBe('2026-11-01T00:00:00.000Z');
  });

  it('drops the rule links to a tag of another category and deletes the rules left with no action', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await insertOldTag('tag-food', 'food');
    await tagTransaction(await newTransaction(food), 'tag-food');
    await insertRule('rule-fits', food, ['tag-food']);
    await insertRule('rule-other', home, ['tag-food']);
    await insertRule('rule-tag-only', null, ['tag-food']);

    await migrateToLatest(db);

    expect(await db.selectFrom('category_rule_tags').selectAll().execute()).toEqual([
      { rule_id: 'rule-fits', tag_id: 'tag-food' },
    ]);
    const rules = await db.selectFrom('category_rules').select('id').orderBy('id').execute();
    expect(rules).toEqual([{ id: 'rule-fits' }, { id: 'rule-other' }]);
  });

  it('makes the name unique inside a category only, and the category required', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await migrateToLatest(db);
    const insert = (id: string, name: string, categoryId: string | null) =>
      sql`insert into tags (id, name, category_id, archived_at, created_at, updated_at)
        values (${id}, ${name}, ${categoryId}, null, ${NOW}, ${NOW})`.execute(db);

    await insert('t1', 'Promo', food);
    await insert('t2', 'promo', home);

    await expect(insert('t3', 'PROMO', food)).rejects.toThrow(/UNIQUE constraint failed/);
    await expect(insert('t4', 'x', null)).rejects.toThrow(/NOT NULL constraint failed/);
    await expect(insert('t5', 'x', 'missing-category')).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('leaves the foreign keys on and consistent', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    await insertOldTag('tag-1', 'promo');
    await tagTransaction(await newTransaction(food), 'tag-1');

    await migrateToLatest(db);

    const { rows: check } = await sql`pragma foreign_key_check`.execute(db);
    expect(check).toEqual([]);
    const { rows: keys } = await sql<{ foreign_keys: number }>`pragma foreign_keys`.execute(db);
    expect(keys[0]?.foreign_keys).toBe(1);
  });

  // A split transaction has no category of its own: the categories of its parts count.
  const splitTransaction = async (parts: (string | null)[]) => {
    const transactionId = await newTransaction(null);
    for (const [index, categoryId] of parts.entries()) {
      await sql`insert into transaction_splits (id, transaction_id, position, amount_cents, nature, category_id)
        values (${`${transactionId}-${String(index)}`}, ${transactionId}, ${index + 1}, -500, 'expense', ${categoryId})`.execute(
        db,
      );
    }
    return transactionId;
  };

  it('counts the categories of the parts of a split transaction, so a tag only on split ones stays', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await insertOldTag('tag-1', 'only-split');
    const divided = await splitTransaction([food, home, home]);
    await tagTransaction(divided, 'tag-1');
    const dividedToo = await splitTransaction([home, null]);
    await tagTransaction(dividedToo, 'tag-1');

    await migrateToLatest(db);

    // `home` is used by two transactions (a split with two parts there counts once), `food` by one.
    expect(await tagRows()).toEqual([`only-split:${home}`]);
    expect(await tagIdsOf(divided)).toEqual(['tag-1']);
    expect(await tagIdsOf(dividedToo)).toEqual(['tag-1']);
  });

  it('counts a split transaction once per category, not once per part', async () => {
    const many = await insertTestCategory(db, { name: 'Zeta' });
    const plain = await insertTestCategory(db, { name: 'Alfa' });
    await insertOldTag('tag-1', 'promo');
    // By part `many` would win (3 to 2); by transaction `plain` wins (2 to 1).
    await tagTransaction(await splitTransaction([many, many, many]), 'tag-1');
    await tagTransaction(await newTransaction(plain), 'tag-1');
    await tagTransaction(await newTransaction(plain), 'tag-1');

    await migrateToLatest(db);

    expect(await tagRows()).toEqual([`promo:${plain}`]);
  });

  it('takes the tag off a split transaction none of whose parts has the category of the tag', async () => {
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await insertOldTag('tag-1', 'promo');
    await tagTransaction(await newTransaction(food), 'tag-1');
    await tagTransaction(await newTransaction(food), 'tag-1');
    const elsewhere = await splitTransaction([home, null]);
    await tagTransaction(elsewhere, 'tag-1');
    const inside = await splitTransaction([food, home]);
    await tagTransaction(inside, 'tag-1');

    await migrateToLatest(db);

    expect(await tagRows()).toEqual([`promo:${food}`]);
    expect(await tagIdsOf(elsewhere)).toEqual([]);
    expect(await tagIdsOf(inside)).toEqual(['tag-1']);
  });

  it('undoes with data linked: every link survives, repeated names are numbered and the keys hold', async () => {
    await migrateToLatest(db);
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await sql`insert into tags (id, name, category_id, archived_at, created_at, updated_at)
      values ('t1', 'promo', ${food}, null, ${NOW}, ${NOW}), ('t2', 'Promo', ${home}, null, ${NOW}, ${NOW}), ('t3', 'solo', ${home}, null, ${NOW}, ${NOW})`.execute(
      db,
    );
    const inFood = await newTransaction(food);
    const inHome = await newTransaction(home);
    await tagTransaction(inFood, 't1');
    await tagTransaction(inHome, 't2');
    await tagTransaction(inHome, 't3');
    await insertRule('rule-1', food, ['t1']);

    const { error } = await createMigrator(db).migrateTo(BEFORE);

    expect(error).toBeUndefined();
    const rows = (await db
      .selectFrom('tags' as never)
      .select(['id', 'name'] as never[])
      .orderBy('id' as never)
      .execute()) as { id: string; name: string }[];
    expect(rows.map((row) => row.name)).toEqual(['promo', 'Promo (2)', 'solo']);
    expect(await tagIdsOf(inFood)).toEqual(['t1']);
    expect((await tagIdsOf(inHome)).sort()).toEqual(['t2', 't3']);
    expect(await db.selectFrom('category_rule_tags').selectAll().execute()).toEqual([
      { rule_id: 'rule-1', tag_id: 't1' },
    ]);
    const { rows: check } = await sql`pragma foreign_key_check`.execute(db);
    expect(check).toEqual([]);
    const { rows: keys } = await sql<{ foreign_keys: number }>`pragma foreign_keys`.execute(db);
    expect(keys[0]?.foreign_keys).toBe(1);
  });

  it('runs on an empty database and undoes to the loose tags', async () => {
    await migrateToLatest(db);
    const food = await insertTestCategory(db, { name: 'Alimentação' });
    const home = await insertTestCategory(db, { name: 'Casa' });
    await sql`insert into tags (id, name, category_id, archived_at, created_at, updated_at)
      values ('t1', 'promo', ${food}, null, ${NOW}, ${NOW}), ('t2', 'promo', ${home}, null, ${NOW}, ${NOW})`.execute(
      db,
    );

    const { error } = await createMigrator(db).migrateTo(BEFORE);

    expect(error).toBeUndefined();
    const names = (await db
      .selectFrom('tags' as never)
      .select('name' as never)
      .execute()) as {
      name: string;
    }[];
    expect(new Set(names.map((row) => row.name.toLowerCase())).size).toBe(2);
  });
});
