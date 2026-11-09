import { CATEGORY_ICONS } from '@fincheck/shared/categories/category/category.constant.ts';
import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMigrator } from '#/database/create-migrator.util.ts';
import { migrateToLatest } from '#/database/migrate-to-latest.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

const EXPECTED_TABLES = [
  'accounts',
  'backup_settings',
  'bill_payment_dismissals',
  'bill_payments',
  'bills',
  'categories',
  'category_rule_tags',
  'category_rules',
  'credit_cards',
  'installment_plans',
  'invoice_payment_dismissals',
  'invoice_payments',
  'invoices',
  'occurrence_payments',
  'profile',
  'recurrence_occurrences',
  'recurrences',
  'rule_suggestions',
  'subscription_suggestion_dismissals',
  'sync_account_links',
  'sync_connections',
  'sync_runs',
  'sync_settings',
  'sync_transaction_links',
  'tags',
  'transaction_splits',
  'transaction_tags',
  'transactions',
];

describe('database migrations', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.destroy();
  });

  const listTables = async () => {
    const { rows } = await sql<{ name: string; strict: number }>`
      select name, strict from pragma_table_list
      where schema = 'main' and type = 'table' and name not like 'sqlite_%' and name not like 'kysely_%'
      order by name`.execute(database.db);

    return rows;
  };

  it('applies all of them: every table of the ERD exists', async () => {
    const tables = await listTables();

    expect(tables.map((table) => table.name)).toEqual(EXPECTED_TABLES);
    expect(EXPECTED_TABLES).toHaveLength(28);
  });

  it('makes every table STRICT', async () => {
    const tables = await listTables();

    expect(tables.filter((table) => table.strict !== 1)).toEqual([]);
  });

  it('leaves the database with consistent foreign keys', async () => {
    const { rows } = await sql`select * from pragma_foreign_key_check`.execute(database.db);

    expect(rows).toEqual([]);
  });

  it('seeds the profile row: id 1, "Você", "V", no avatar', async () => {
    const profiles = await database.db.selectFrom('profile').selectAll().execute();

    expect(profiles).toHaveLength(1);
    const { updated_at: updatedAt, ...rest } = profiles[0]!;
    expect(rest).toEqual({ id: 1, name: 'Você', initials: 'V', avatar_id: null });
    expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('seeds only the default categories', async () => {
    for (const table of ['tags', 'accounts', 'transactions', 'category_rules'] as const) {
      expect(await database.db.selectFrom(table).selectAll().execute()).toEqual([]);
    }
  });

  it('seeds the ready-made categories, all default and active, with valid ids and icons', async () => {
    const rows = await database.db.selectFrom('categories').selectAll().execute();

    expect(rows).toHaveLength(30);
    expect(rows.filter((row) => row.kind === 'expense')).toHaveLength(24);
    expect(rows.filter((row) => row.kind === 'income')).toHaveLength(6);
    expect(rows.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        'Restaurantes',
        'Delivery',
        'Mercado',
        'Salário',
        'Outras receitas',
        'Combustível',
        'Cuidados pessoais',
        'Rendimentos',
        'Vendas',
      ]),
    );
    for (const row of rows) {
      expect(row.is_default).toBe(1);
      expect(row.archived_at).toBeNull();
      expect(idSchema.safeParse(row.id).success).toBe(true);
      expect(CATEGORY_ICONS).toContain(row.icon);
    }
  });

  it('applying again changes nothing', async () => {
    await migrateToLatest(database.db);

    expect(await listTables()).toHaveLength(28);
  });

  it('undoes all of them, one by one, back to an empty database', async () => {
    const migrator = createMigrator(database.db);

    let undone = 0;
    for (;;) {
      const { error, results } = await migrator.migrateDown();
      expect(error).toBeUndefined();
      if (!results?.length) break;
      undone++;
    }

    expect(undone).toBe(11);
    expect(await listTables()).toEqual([]);
  }, 30_000);

  it('applies again after undoing everything', async () => {
    const migrator = createMigrator(database.db);
    while ((await migrator.migrateDown()).results?.length) {
      // keep going until there is nothing left to undo
    }

    await migrateToLatest(database.db);

    expect((await listTables()).map((table) => table.name)).toEqual(EXPECTED_TABLES);
  });
});
