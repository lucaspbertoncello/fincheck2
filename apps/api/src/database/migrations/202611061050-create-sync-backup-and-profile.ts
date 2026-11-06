import type { Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// The rest of block C. Owners: `sync`, `backup` and `profile`. The single-row tables
// (`sync_settings`, `backup_settings`, `profile`) hold `id = 1` only. `profile` is born with its
// row ("Você", "V"), so `updated_at` always has an origin.
export async function up(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `CREATE TABLE sync_settings (
      id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
      client_id TEXT NOT NULL,
      client_secret_encrypted BLOB NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,

    `CREATE TABLE sync_connections (
      id TEXT NOT NULL PRIMARY KEY,
      pluggy_item_id TEXT NOT NULL,
      institution_code TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'error', 'disconnected')),
      error_code TEXT,
      last_bank_update_at TEXT,
      last_success_at TEXT,
      history_status TEXT NOT NULL CHECK (history_status IN ('pending', 'running', 'done')),
      history_from_on TEXT CHECK (history_from_on = date(history_from_on)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE UNIQUE INDEX sync_connections_pluggy_item_id_unique ON sync_connections (pluggy_item_id)`,

    `CREATE TABLE sync_account_links (
      pluggy_account_id TEXT NOT NULL PRIMARY KEY,
      pluggy_name TEXT NOT NULL,
      pluggy_type TEXT NOT NULL CHECK (pluggy_type IN ('checking', 'savings', 'credit_card')),
      connection_id TEXT NOT NULL REFERENCES sync_connections (id) ON DELETE CASCADE,
      account_id TEXT REFERENCES accounts (id) ON DELETE CASCADE,
      number_hint TEXT,
      cursor_on TEXT CHECK (cursor_on = date(cursor_on))
    ) STRICT`,
    `CREATE INDEX sync_account_links_connection_id_index ON sync_account_links (connection_id)`,
    `CREATE UNIQUE INDEX sync_account_links_account_id_unique ON sync_account_links (account_id)`,

    `CREATE TABLE sync_transaction_links (
      pluggy_transaction_id TEXT NOT NULL PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
      provider_ref TEXT,
      last_seen_at TEXT NOT NULL
    ) STRICT`,
    `CREATE UNIQUE INDEX sync_transaction_links_transaction_id_unique ON sync_transaction_links (transaction_id)`,
    `CREATE INDEX sync_transaction_links_provider_ref_index ON sync_transaction_links (provider_ref)`,

    `CREATE TABLE sync_runs (
      id TEXT NOT NULL PRIMARY KEY,
      connection_id TEXT NOT NULL REFERENCES sync_connections (id) ON DELETE CASCADE,
      "trigger" TEXT NOT NULL CHECK ("trigger" IN ('schedule', 'first_connection', 'retry')),
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
      error_code TEXT,
      created_count INTEGER NOT NULL CHECK (created_count >= 0),
      updated_count INTEGER NOT NULL CHECK (updated_count >= 0),
      removed_count INTEGER NOT NULL CHECK (removed_count >= 0)
    ) STRICT`,
    `CREATE INDEX sync_runs_connection_started_at_index ON sync_runs (connection_id, started_at)`,

    `CREATE TABLE backup_settings (
      id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
      folder_path TEXT NOT NULL,
      last_error_at TEXT,
      last_error_code TEXT,
      updated_at TEXT NOT NULL
    ) STRICT`,

    `CREATE TABLE profile (
      id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
      initials TEXT NOT NULL CHECK (length(initials) BETWEEN 1 AND 3),
      avatar_id TEXT,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `INSERT INTO profile (id, name, initials, avatar_id, updated_at)
      VALUES (1, 'Você', 'V', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `DROP TABLE profile`,
    `DROP TABLE backup_settings`,
    `DROP TABLE sync_runs`,
    `DROP TABLE sync_transaction_links`,
    `DROP TABLE sync_account_links`,
    `DROP TABLE sync_connections`,
    `DROP TABLE sync_settings`,
  ]);
}
