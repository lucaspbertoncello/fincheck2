import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { sql, type Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Owner: `categories`. Ten more ready-made categories (BR-CAT-001), taking the seed from 15 to 25
// (decided by the PM on 06/11/2026). `202611061100` is never edited: the list grows here. The ids
// are fixed UUIDs (version 7 layout) that go on from the ones of the first seed (`...0f`).
const SEED_TIMESTAMP = '2026-11-08T00:00:00.000Z';

const MORE_CATEGORIES: { id: string; kind: 'expense' | 'income'; name: string; icon: string }[] = [
  {
    id: '019a5a00-0000-7000-8000-000000000010',
    kind: 'expense',
    name: 'Combustível',
    icon: 'fuel',
  },
  {
    id: '019a5a00-0000-7000-8000-000000000011',
    kind: 'expense',
    name: 'Cuidados pessoais',
    icon: 'care',
  },
  { id: '019a5a00-0000-7000-8000-000000000012', kind: 'expense', name: 'Esportes', icon: 'gym' },
  { id: '019a5a00-0000-7000-8000-000000000013', kind: 'expense', name: 'Viagem', icon: 'plane' },
  {
    id: '019a5a00-0000-7000-8000-000000000014',
    kind: 'expense',
    name: 'Tecnologia',
    icon: 'phone',
  },
  { id: '019a5a00-0000-7000-8000-000000000015', kind: 'expense', name: 'Pets', icon: 'pet' },
  {
    id: '019a5a00-0000-7000-8000-000000000016',
    kind: 'expense',
    name: 'Presentes e doações',
    icon: 'gift',
  },
  {
    id: '019a5a00-0000-7000-8000-000000000017',
    kind: 'expense',
    name: 'Impostos e taxas',
    icon: 'receipt',
  },
  {
    id: '019a5a00-0000-7000-8000-000000000018',
    kind: 'income',
    name: 'Rendimentos',
    icon: 'trend',
  },
  {
    id: '019a5a00-0000-7000-8000-000000000019',
    kind: 'income',
    name: 'Vendas',
    icon: 'handmoney',
  },
];

export async function up(db: Kysely<unknown>): Promise<void> {
  // Lucas may have created one of these already: the same kind and name (without case or accent,
  // the way the app compares them) is skipped, not duplicated.
  const existing = await sql<{ kind: string; name: string }>`SELECT kind, name FROM categories`
    .execute(db)
    .then((result) => new Set(result.rows.map((row) => `${row.kind}|${normalizeText(row.name)}`)));
  const missing = MORE_CATEGORIES.filter(
    (category) => !existing.has(`${category.kind}|${normalizeText(category.name)}`),
  );
  if (missing.length === 0) return;

  const rows = missing.map(
    (category) =>
      `('${category.id}', '${category.kind}', '${category.name}', '${category.icon}', 1, NULL, '${SEED_TIMESTAMP}', '${SEED_TIMESTAMP}')`,
  );

  await executeStatements(db, [
    `INSERT INTO categories (id, kind, name, icon, is_default, archived_at, created_at, updated_at) VALUES ${rows.join(', ')}`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const ids = MORE_CATEGORIES.map((category) => `'${category.id}'`);

  // Only the rows this migration inserted have these ids: a category Lucas created with the same
  // name has another id and stays. Fails if a transaction already uses one of them: the foreign
  // keys protect the history.
  await executeStatements(db, [`DELETE FROM categories WHERE id IN (${ids.join(', ')})`]);
}
