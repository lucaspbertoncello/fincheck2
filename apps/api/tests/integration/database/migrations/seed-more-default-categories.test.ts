import { CATEGORY_ICONS } from '@fincheck/shared/categories/category/category.constant.ts';
import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMigrator } from '#/database/create-migrator.util.ts';
import type { Database } from '#/database/database.type.ts';
import { createSqliteClient } from '#/database/sqlite.client.ts';

const FIRST_SEED = '202611061100-seed-default-categories';
const MORE_SEED = '202611081000-seed-more-default-categories';

const NEW_NAMES = [
  'Combustível',
  'Cuidados pessoais',
  'Esportes',
  'Viagem',
  'Tecnologia',
  'Pets',
  'Presentes e doações',
  'Impostos e taxas',
  'Rendimentos',
  'Vendas',
];

describe('seed of the ten more categories', () => {
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

  it('leaves 25 default categories in a new database, with the table of the PM', async () => {
    await createMigrator(db).migrateTo(MORE_SEED);

    const rows = await db.selectFrom('categories').selectAll().orderBy('id').execute();
    expect(rows).toHaveLength(25);
    expect(rows.every((row) => row.is_default === 1 && row.archived_at === null)).toBe(true);
    expect(new Set(rows.map((row) => row.id)).size).toBe(25);

    const added = rows.slice(15);
    expect(added.map((row) => [row.name, row.kind, row.icon])).toEqual([
      ['Combustível', 'expense', 'fuel'],
      ['Cuidados pessoais', 'expense', 'care'],
      ['Esportes', 'expense', 'gym'],
      ['Viagem', 'expense', 'plane'],
      ['Tecnologia', 'expense', 'phone'],
      ['Pets', 'expense', 'pet'],
      ['Presentes e doações', 'expense', 'gift'],
      ['Impostos e taxas', 'expense', 'receipt'],
      ['Rendimentos', 'income', 'trend'],
      ['Vendas', 'income', 'handmoney'],
    ]);
    for (const row of added) {
      expect(idSchema.safeParse(row.id).success).toBe(true);
      expect(CATEGORY_ICONS).toContain(row.icon);
    }
    expect(added[0]?.id).toBe('019a5a00-0000-7000-8000-000000000010');
  });

  it('does not repeat a name Lucas already created by hand (same kind, no case or accent)', async () => {
    const migrator = createMigrator(db);
    await migrator.migrateTo(FIRST_SEED);
    await insertByHand('11111111-1111-7111-8111-111111111111', 'expense', 'Pets');
    await insertByHand('22222222-2222-7222-8222-222222222222', 'expense', 'cuidados PESSOAIS');
    await insertByHand('33333333-3333-7333-8333-333333333333', 'expense', 'COMBUSTIVEL');
    // The same name in the other kind is another category: it does not block the new one.
    await insertByHand('44444444-4444-7444-8444-444444444444', 'income', 'Esportes');

    await migrator.migrateTo(MORE_SEED);

    const rows = await db.selectFrom('categories').select(['kind', 'name']).execute();
    expect(rows).toHaveLength(15 + 4 + 7);
    const keys = rows.map(
      (row) => `${row.kind}|${row.name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(rows.filter((row) => row.name.toLowerCase() === 'pets')).toHaveLength(1);
    expect(rows.filter((row) => row.kind === 'expense' && row.name === 'Esportes')).toHaveLength(1);
    expect(rows.filter((row) => row.kind === 'income' && row.name === 'Esportes')).toHaveLength(1);
  });

  it('undoes only the rows it inserted and keeps the ones made by hand', async () => {
    const migrator = createMigrator(db);
    await migrator.migrateTo(FIRST_SEED);
    await insertByHand('11111111-1111-7111-8111-111111111111', 'expense', 'Pets');
    await migrator.migrateTo(MORE_SEED);

    const { error } = await migrator.migrateTo(FIRST_SEED);

    expect(error).toBeUndefined();
    const names = (await db.selectFrom('categories').select('name').execute()).map(
      (row) => row.name,
    );
    expect(names).toHaveLength(16);
    expect(names).toContain('Pets');
    for (const name of NEW_NAMES.filter((name) => name !== 'Pets'))
      expect(names).not.toContain(name);
    expect(
      await db.selectFrom('categories').select('id').where('name', '=', 'Pets').executeTakeFirst(),
    ).toEqual({ id: '11111111-1111-7111-8111-111111111111' });
  });

  it('applies again after undoing it, and a second run changes nothing', async () => {
    const migrator = createMigrator(db);
    await migrator.migrateTo(MORE_SEED);
    await migrator.migrateTo(FIRST_SEED);

    await migrator.migrateTo(MORE_SEED);
    await migrator.migrateTo(MORE_SEED);

    expect(await db.selectFrom('categories').select('id').execute()).toHaveLength(25);
  });
});
