import type { Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Owner: `categories`. `category_rules` and its tag link come
// later (202611061020): the rules point to `accounts`, which does not exist yet.
export async function up(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `CREATE TABLE categories (
      id TEXT NOT NULL PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE UNIQUE INDEX categories_kind_name_unique ON categories (kind, name COLLATE NOCASE)`,

    `CREATE TABLE tags (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE UNIQUE INDEX tags_name_unique ON tags (name COLLATE NOCASE)`,

    `CREATE TABLE rule_suggestions (
      id TEXT NOT NULL PRIMARY KEY,
      pattern TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('accepted', 'dismissed')),
      decided_at TEXT NOT NULL
    ) STRICT`,
    `CREATE UNIQUE INDEX rule_suggestions_pattern_category_unique ON rule_suggestions (pattern, category_id)`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `DROP TABLE rule_suggestions`,
    `DROP TABLE tags`,
    `DROP TABLE categories`,
  ]);
}
