import type { Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Block A, owner: `accounts`.
export async function up(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `CREATE TABLE accounts (
      id TEXT NOT NULL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'wallet', 'credit_card')),
      source TEXT NOT NULL CHECK (source IN ('pluggy', 'manual')),
      name TEXT NOT NULL,
      institution_code TEXT NOT NULL,
      institution_name TEXT,
      bank_balance_cents INTEGER,
      bank_balance_at TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (type <> 'wallet' OR source = 'manual'),
      CHECK (source = 'pluggy' OR bank_balance_cents IS NULL)
    ) STRICT`,
    `CREATE INDEX accounts_type_index ON accounts (type)`,
    `CREATE INDEX accounts_archived_at_type_index ON accounts (archived_at, type)`,

    `CREATE TABLE credit_cards (
      account_id TEXT NOT NULL PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
      brand TEXT NOT NULL CHECK (brand IN ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other')),
      last4 TEXT CHECK (last4 GLOB '[0-9][0-9][0-9][0-9]'),
      closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
      due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
      limit_cents INTEGER,
      theme_id TEXT
    ) STRICT`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [`DROP TABLE credit_cards`, `DROP TABLE accounts`]);
}
