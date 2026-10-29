import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

import type { Database } from '#/database/database.type.ts';

export function createSqliteClient(file: string): Kysely<Database> {
  mkdirSync(dirname(file), { recursive: true });

  const sqlite = new BetterSqlite3(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');

  const journalMode: unknown = sqlite.pragma('journal_mode', { simple: true });
  const foreignKeys: unknown = sqlite.pragma('foreign_keys', { simple: true });
  if (journalMode !== 'wal' || foreignKeys !== 1) {
    sqlite.close();
    throw new Error(
      `SQLite pragmas not applied: journal_mode=${String(journalMode)}, foreign_keys=${String(foreignKeys)}`,
    );
  }

  return new Kysely<Database>({ dialect: new SqliteDialect({ database: sqlite }) });
}
