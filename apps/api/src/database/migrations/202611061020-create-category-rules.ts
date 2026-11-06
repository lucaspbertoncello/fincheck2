import type { Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Owner: `categories`. Needs `accounts`, `categories` and `tags`.
export async function up(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `CREATE TABLE category_rules (
      id TEXT NOT NULL PRIMARY KEY,
      description_contains TEXT,
      counterparty_contains TEXT,
      kind TEXT CHECK (kind IN ('expense', 'income')),
      account_id TEXT REFERENCES accounts (id) ON DELETE CASCADE,
      amount_min_cents INTEGER CHECK (amount_min_cents >= 0),
      amount_max_cents INTEGER CHECK (amount_max_cents >= 0),
      category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
      enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (description_contains IS NOT NULL OR counterparty_contains IS NOT NULL)
    ) STRICT`,
    `CREATE INDEX category_rules_enabled_created_at_index ON category_rules (enabled, created_at)`,

    `CREATE TABLE category_rule_tags (
      rule_id TEXT NOT NULL REFERENCES category_rules (id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags (id) ON DELETE RESTRICT,
      PRIMARY KEY (rule_id, tag_id)
    ) STRICT`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [`DROP TABLE category_rule_tags`, `DROP TABLE category_rules`]);
}
