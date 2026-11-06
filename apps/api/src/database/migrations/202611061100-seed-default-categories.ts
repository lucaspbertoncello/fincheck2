import type { Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Owner: `categories`. The ready-made categories (BR-CAT-001), the same list the front mock shows.
// The ids are fixed UUIDs (version 7 layout) so every installation starts with the same ones.
// The list is not closed with the designer yet (Q2): a new one goes in a new migration, this one
// is never edited.
const SEED_TIMESTAMP = '2026-11-06T00:00:00.000Z';

const DEFAULT_CATEGORIES: { id: string; kind: 'expense' | 'income'; name: string; icon: string }[] =
  [
    { id: '019a5a00-0000-7000-8000-000000000001', kind: 'expense', name: 'Mercado', icon: 'cart' },
    {
      id: '019a5a00-0000-7000-8000-000000000002',
      kind: 'expense',
      name: 'Restaurantes',
      icon: 'food',
    },
    {
      id: '019a5a00-0000-7000-8000-000000000003',
      kind: 'expense',
      name: 'Delivery',
      icon: 'deliv',
    },
    {
      id: '019a5a00-0000-7000-8000-000000000004',
      kind: 'expense',
      name: 'Transporte',
      icon: 'car',
    },
    { id: '019a5a00-0000-7000-8000-000000000005', kind: 'expense', name: 'Moradia', icon: 'house' },
    { id: '019a5a00-0000-7000-8000-000000000006', kind: 'expense', name: 'Saúde', icon: 'health' },
    { id: '019a5a00-0000-7000-8000-000000000007', kind: 'expense', name: 'Lazer', icon: 'fun' },
    {
      id: '019a5a00-0000-7000-8000-000000000008',
      kind: 'expense',
      name: 'Assinaturas',
      icon: 'subs',
    },
    { id: '019a5a00-0000-7000-8000-000000000009', kind: 'expense', name: 'Educação', icon: 'book' },
    { id: '019a5a00-0000-7000-8000-00000000000a', kind: 'expense', name: 'Compras', icon: 'shirt' },
    { id: '019a5a00-0000-7000-8000-00000000000b', kind: 'expense', name: 'Outros', icon: 'tag' },
    { id: '019a5a00-0000-7000-8000-00000000000c', kind: 'income', name: 'Salário', icon: 'salary' },
    {
      id: '019a5a00-0000-7000-8000-00000000000d',
      kind: 'income',
      name: 'Freelance',
      icon: 'coins',
    },
    {
      id: '019a5a00-0000-7000-8000-00000000000e',
      kind: 'income',
      name: 'Benefícios',
      icon: 'wallet',
    },
    {
      id: '019a5a00-0000-7000-8000-00000000000f',
      kind: 'income',
      name: 'Outras receitas',
      icon: 'dollar',
    },
  ];

export async function up(db: Kysely<unknown>): Promise<void> {
  const rows = DEFAULT_CATEGORIES.map(
    (category) =>
      `('${category.id}', '${category.kind}', '${category.name}', '${category.icon}', 1, NULL, '${SEED_TIMESTAMP}', '${SEED_TIMESTAMP}')`,
  );

  await executeStatements(db, [
    `INSERT INTO categories (id, kind, name, icon, is_default, archived_at, created_at, updated_at) VALUES ${rows.join(', ')}`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const ids = DEFAULT_CATEGORIES.map((category) => `'${category.id}'`);

  // Fails if a transaction already uses one of them: the foreign keys protect the history.
  await executeStatements(db, [`DELETE FROM categories WHERE id IN (${ids.join(', ')})`]);
}
